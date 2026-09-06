import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticketNumber.js";
import { isRateLimited, recordTicketCreation } from "./utils/rateLimiter.js";

export const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB soft limit for multer parser (5MB strict validation in route)
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (BR-27)
const ALLOWED_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

// ---------------------------------------------------------------------------
// Health API — GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Reference Data APIs — GET /api/requesters, GET /api/related-systems, GET /api/categories
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true, department: true },
    });
    res.status(200).json({ data: requesters });
  } catch (error) {
    console.error("Error fetching requesters:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load Development Requesters.",
      },
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, description: true },
    });
    res.status(200).json({ data: systems });
  } catch (error) {
    console.error("Error fetching related systems:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load Related Systems.",
      },
    });
  }
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json({ data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load Categories.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// My Tickets API — GET /api/tickets (F-06)
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Validate requesterId (Required parameter)
    const requesterIdRaw = req.query.requesterId;
    if (!requesterIdRaw) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "requesterId query parameter is required.",
        },
      });
    }

    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId)) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "requesterId must be a valid integer.",
        },
      });
    }

    // Check requester existence & active status in DB
    const requester = await prisma.requester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(404).json({
        error: {
          code: "REQUESTER_NOT_FOUND",
          message: "The selected Development Requester could not be found.",
        },
      });
    }

    // 2. Parse & Validate Pagination
    const pageRaw = req.query.page;
    const page = pageRaw ? parseInt(String(pageRaw), 10) : 1;
    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "page must be an integer greater than or equal to 1.",
        },
      });
    }

    const pageSizeRaw = req.query.pageSize;
    const pageSize = pageSizeRaw ? parseInt(String(pageSizeRaw), 10) : 10;
    if (isNaN(pageSize) || ![10, 25, 50].includes(pageSize)) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "pageSize must be one of 10, 25, or 50.",
        },
      });
    }

    // 3. Parse & Validate Sorting
    const sortByRaw = req.query.sortBy;
    const sortBy = sortByRaw ? String(sortByRaw).toLowerCase() : "priority";
    if (!["priority", "status"].includes(sortBy)) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "sortBy must be either 'priority' or 'status'.",
        },
      });
    }

    const sortDirectionRaw = req.query.sortDirection;
    const sortDirection = sortDirectionRaw ? String(sortDirectionRaw).toLowerCase() : "desc";
    if (!["asc", "desc"].includes(sortDirection)) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "sortDirection must be either 'asc' or 'desc'.",
        },
      });
    }

    // 4. Parse Filters
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const statusFilter = req.query.status ? String(req.query.status).trim() : undefined;
    const priorityFilter = req.query.priority ? String(req.query.priority).trim() : undefined;

    const categoryIdRaw = req.query.categoryId;
    let categoryIdFilter: number | undefined = undefined;
    if (categoryIdRaw !== undefined) {
      categoryIdFilter = parseInt(String(categoryIdRaw), 10);
      if (isNaN(categoryIdFilter)) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "categoryId filter must be a valid integer.",
          },
        });
      }
    }

    const relatedSystemIdRaw = req.query.relatedSystemId;
    let relatedSystemIdFilter: number | undefined = undefined;
    if (relatedSystemIdRaw !== undefined) {
      relatedSystemIdFilter = parseInt(String(relatedSystemIdRaw), 10);
      if (isNaN(relatedSystemIdFilter)) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "relatedSystemId filter must be a valid integer.",
          },
        });
      }
    }

    // 5. Build Prisma Where Condition
    const whereClause: any = {
      requesterId,
    };

    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (statusFilter) {
      whereClause.currentStatus = { equals: statusFilter, mode: "insensitive" };
    }

    if (priorityFilter) {
      const upPriority = priorityFilter.toUpperCase();
      if (upPriority === "NONE" || upPriority === "UNASSIGNED" || upPriority === "NULL") {
        whereClause.requestedPriority = null;
      } else {
        whereClause.requestedPriority = { equals: upPriority, mode: "insensitive" };
      }
    }

    if (categoryIdFilter !== undefined) {
      whereClause.categoryId = categoryIdFilter;
    }

    if (relatedSystemIdFilter !== undefined) {
      whereClause.relatedSystemId = relatedSystemIdFilter;
    }

    // 6. Fetch Matching Tickets
    const rawTickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    // 7. Multi-Tier Custom Rank Sorting (BR-23, BR-24)
    const isAsc = sortDirection === "asc";

    const comparePriority = (pA: string | null | undefined, pB: string | null | undefined, isAscending: boolean): number => {
      // Unassigned (null/undefined) is always ranked after assigned priorities within the same sort direction (BR-23, Spec 5.1)
      if (!pA && !pB) return 0;
      if (!pA) return 1;  // pA is unassigned -> placed after assigned pB
      if (!pB) return -1; // pB is unassigned -> pA placed before unassigned pB

      const getRank = (p: string): number => {
        const up = p.toUpperCase();
        if (up === "URGENT") return 1;
        if (up === "HIGH") return 2;
        if (up === "MEDIUM") return 3;
        if (up === "LOW") return 4;
        return 5;
      };

      const rankA = getRank(pA);
      const rankB = getRank(pB);

      // In desc mode (default): URGENT (1) comes before LOW (4) -> rankA - rankB
      // In asc mode: LOW (4) comes before URGENT (1) -> rankB - rankA
      return isAscending ? rankB - rankA : rankA - rankB;
    };

    const compareStatus = (sA: string | null | undefined, sB: string | null | undefined, isAscending: boolean): number => {
      const getRank = (s: string | null | undefined): number => {
        if (!s) return 5;
        const lower = s.toLowerCase();
        if (lower === "new") return 1;
        if (lower === "in progress") return 2;
        if (lower === "resolved") return 3;
        if (lower === "closed") return 4;
        return 5;
      };

      const rankA = getRank(sA);
      const rankB = getRank(sB);

      // In asc mode: New (1) -> In Progress (2) -> Resolved (3) -> Closed (4) -> rankA - rankB
      // In desc mode: Closed (4) -> Resolved (3) -> In Progress (2) -> New (1) -> rankB - rankA
      return isAscending ? rankA - rankB : rankB - rankA;
    };

    const compareTicketNumber = (numA: string, numB: string, isAscending: boolean): number => {
      const cmp = numA.localeCompare(numB);
      return isAscending ? cmp : -cmp;
    };

    rawTickets.sort((a, b) => {
      let comp1 = 0;
      let comp2 = 0;
      let comp3 = 0;

      if (sortBy === "priority") {
        comp1 = comparePriority(a.requestedPriority, b.requestedPriority, isAsc);
        comp2 = compareStatus(a.currentStatus, b.currentStatus, isAsc);
        comp3 = compareTicketNumber(a.ticketNumber, b.ticketNumber, isAsc);
      } else { // sortBy === "status"
        comp1 = compareStatus(a.currentStatus, b.currentStatus, isAsc);
        comp2 = comparePriority(a.requestedPriority, b.requestedPriority, isAsc);
        comp3 = compareTicketNumber(a.ticketNumber, b.ticketNumber, isAsc);
      }

      if (comp1 !== 0) return comp1;
      if (comp2 !== 0) return comp2;
      return comp3;
    });

    // 8. Pagination Slicing & Metadata (BR-25)
    const totalItems = rawTickets.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
    const hasPreviousPage = page > 1;
    const hasNextPage = page < totalPages;

    const startIndex = (page - 1) * pageSize;
    const paginatedItems = rawTickets.slice(startIndex, startIndex + pageSize).map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      category: t.category,
      relatedSystem: t.relatedSystem,
      requestedPriority: t.requestedPriority,
      currentStatus: t.currentStatus,
      createdAt: t.createdAt,
    }));

    return res.status(200).json({
      data: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage,
        hasNextPage,
      },
    });
  } catch (error) {
    console.error("Error loading tickets:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load tickets.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Ticket Creation API — POST /api/tickets (F-05)
// ---------------------------------------------------------------------------
app.post("/api/tickets", upload.array("attachments", 10), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Parse fields
    const requesterId = parseInt(req.body.requesterId, 10);
    const categoryId = parseInt(req.body.categoryId, 10);
    const relatedSystemId = parseInt(req.body.relatedSystemId, 10);
    const summary = req.body.summary ? String(req.body.summary).trim() : "";
    const description = req.body.description ? String(req.body.description).trim() : "";
    const requestedPriorityRaw = req.body.requestedPriority ? String(req.body.requestedPriority).trim() : undefined;
    const requestedPriority = requestedPriorityRaw ? requestedPriorityRaw.toUpperCase() : undefined;
    const files = (req.files as Express.Multer.File[]) || [];

    // 2. Cooldown Rate Limit Check (BR-18, BR-19)
    if (!isNaN(requesterId) && isRateLimited(requesterId)) {
      return res.status(429).json({
        error: {
          code: "TICKET_CREATION_RATE_LIMITED",
          message: "You are submitting tickets too quickly. Please wait before trying again.",
        },
      });
    }

    // 3. Field Validations (BR-11, BR-12, BR-13, BR-15)
    const details: Array<{ field: string; message: string }> = [];

    if (isNaN(requesterId)) {
      details.push({ field: "requesterId", message: "Requester ID is required." });
    }
    if (isNaN(categoryId)) {
      details.push({ field: "categoryId", message: "Category ID is required." });
    }
    if (isNaN(relatedSystemId)) {
      details.push({ field: "relatedSystemId", message: "Related System ID is required." });
    }
    if (!summary) {
      details.push({ field: "summary", message: "Summary is required." });
    } else if (summary.length > 255) {
      details.push({ field: "summary", message: "Summary cannot exceed 255 characters." });
    }

    if (!description) {
      details.push({ field: "description", message: "Description is required." });
    } else if (description.length < 20) {
      details.push({ field: "description", message: "Description must contain at least 20 characters." });
    }

    if (requestedPriority && !ALLOWED_PRIORITIES.includes(requestedPriority)) {
      details.push({ field: "requestedPriority", message: "Requested priority must be URGENT, HIGH, MEDIUM, or LOW." });
    }

    if (details.length > 0) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted ticket data is invalid.",
          details,
        },
      });
    }

    // 4. Validate active entity existence in DB
    const [requester, category, relatedSystem] = await Promise.all([
      prisma.requester.findUnique({ where: { id: requesterId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.relatedSystem.findUnique({ where: { id: relatedSystemId } }),
    ]);

    if (!requester || !requester.isActive) {
      details.push({ field: "requesterId", message: "Selected Requester does not exist or is inactive." });
    }
    if (!category || !category.isActive) {
      details.push({ field: "categoryId", message: "Selected Category does not exist or is inactive." });
    }
    if (!relatedSystem || !relatedSystem.isActive) {
      details.push({ field: "relatedSystemId", message: "Selected Related System does not exist or is inactive." });
    }

    if (details.length > 0) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted ticket data is invalid.",
          details,
        },
      });
    }

    // 5. Attachment Validations (BR-26, BR-27)
    if (files.length > 5) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Maximum 5 attachments allowed per ticket.",
        },
      });
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Disallowed attachment MIME type. Allowed types: JPEG, PNG, WEBP, PDF.",
          },
        });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Attachment exceeds 5 MB size limit.",
          },
        });
      }
    }

    // 6. Atomic Transaction (BR-01, BR-02, BR-29)
    const result = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx as any);

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId,
          relatedSystemId,
          summary,
          description,
          requestedPriority: requestedPriority || null,
          currentStatus: "New",
        },
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      });

      const attachmentRecords = [];
      for (const file of files) {
        const att = await tx.attachment.create({
          data: {
            ticketId: ticket.id,
            fileName: file.originalname,
            contentType: file.mimetype,
            fileSize: file.size,
            fileData: file.buffer,
            isDeleted: false,
          },
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileSize: true,
            createdAt: true,
          },
        });
        attachmentRecords.push(att);
      }

      return {
        ...ticket,
        attachments: attachmentRecords,
      };
    });

    // Record rate limit timestamp
    recordTicketCreation(requesterId);

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to create ticket.",
      },
    });
  }
});

export default app;
