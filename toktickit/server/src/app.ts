import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticketNumber.js";
import { isRateLimited, recordTicketCreation } from "./utils/rateLimiter.js";
import {
  requireAuth,
  requireRole,
  enforcePasswordChangeCheck,
  isPasswordComplex,
  SessionUser,
} from "./middleware/auth.js";

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "toktickit-lab03-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(enforcePasswordChangeCheck);

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
// Authentication & Session APIs
// ---------------------------------------------------------------------------

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "MISSING_FIELDS",
          message: "Email and password are required.",
        },
      });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email address or password.",
        },
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Account is deactivated. Please contact an administrator.",
        },
      });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    };

    req.session.user = sessionUser;

    return req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Session error." } });
      }
      return res.status(200).json({
        user: sessionUser,
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An error occurred during login." },
    });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", requireAuth, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unable to log out." },
      });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// GET /api/auth/me
app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.session.user });
});

// POST /api/auth/change-password
app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: "MISSING_FIELDS",
          message: "Current password and new password are required.",
        },
      });
    }

    const sessionUser = req.session.user!;
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });

    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(400).json({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect.",
        },
      });
    }

    if (!isPasswordComplex(newPassword)) {
      return res.status(400).json({
        error: {
          code: "WEAK_PASSWORD",
          message: "New password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.",
        },
      });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    req.session.user = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      mustChangePassword: false,
    };

    return req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      return res.status(200).json({
        message: "Password changed successfully",
        mustChangePassword: false,
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An error occurred while updating password." },
    });
  }
});

// ---------------------------------------------------------------------------
// Next Ticket Number Preview API — GET /api/tickets/next-number
// ---------------------------------------------------------------------------
app.get("/api/tickets/next-number", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const nextTicketNumber = await generateTicketNumber(prisma as any);
    return res.status(200).json({ data: { nextTicketNumber } });
  } catch (error) {
    console.error("Error generating next ticket number:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to generate next ticket number." },
    });
  }
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
// My Tickets API — GET /api/tickets (F-06 & Lab 3 F-03)
// ---------------------------------------------------------------------------
app.get("/api/tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;

    // Derive requesterId from authenticated session if Requester role
    let requesterId: number;
    if (sessionUser.role === "REQUESTER") {
      requesterId = sessionUser.id;
    } else {
      const requesterIdRaw = req.query.requesterId;
      requesterId = requesterIdRaw ? parseInt(String(requesterIdRaw), 10) : sessionUser.id;
    }

    if (isNaN(requesterId)) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "requesterId must be a valid integer.",
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
// IT Staff Ticket Queue — GET /api/tickets/staff-queue (F-04)
// ---------------------------------------------------------------------------
app.get("/api/tickets/staff-queue", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;

    // Pagination
    const pageRaw = req.query.page;
    const page = pageRaw ? parseInt(String(pageRaw), 10) : 1;
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: { code: "INVALID_QUERY", message: "page must be an integer >= 1." } });
    }

    const pageSizeRaw = req.query.pageSize;
    const pageSize = pageSizeRaw ? parseInt(String(pageSizeRaw), 10) : 10;
    if (isNaN(pageSize) || ![10, 25, 50].includes(pageSize)) {
      return res.status(400).json({ error: { code: "INVALID_QUERY", message: "pageSize must be 10, 25, or 50." } });
    }

    // Sorting
    const sortByRaw = req.query.sortBy;
    const sortBy = sortByRaw ? String(sortByRaw) : "createdAt";
    const sortOrderRaw = req.query.sortOrder || req.query.sortDirection;
    const sortOrder = sortOrderRaw ? String(sortOrderRaw).toLowerCase() : "desc";
    const isAsc = sortOrder === "asc";

    // Filtering
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const statusFilter = req.query.status ? String(req.query.status).trim() : undefined;
    const itPriorityFilter = req.query.itPriority ? String(req.query.itPriority).trim() : undefined;
    const assignmentFilter = req.query.assignment ? String(req.query.assignment).trim().toLowerCase() : undefined;

    const assignedToIdRaw = req.query.assignedToId;
    let assignedToIdFilter: number | null | undefined = undefined;
    if (assignedToIdRaw !== undefined) {
      if (String(assignedToIdRaw).toLowerCase() === "unassigned") {
        assignedToIdFilter = null;
      } else {
        const parsed = parseInt(String(assignedToIdRaw), 10);
        if (!isNaN(parsed)) assignedToIdFilter = parsed;
      }
    }

    const categoryIdRaw = req.query.categoryId;
    let categoryIdFilter: number | undefined = undefined;
    if (categoryIdRaw !== undefined) {
      const parsed = parseInt(String(categoryIdRaw), 10);
      if (!isNaN(parsed)) categoryIdFilter = parsed;
    }

    const relatedSystemIdRaw = req.query.relatedSystemId;
    let relatedSystemIdFilter: number | undefined = undefined;
    if (relatedSystemIdRaw !== undefined) {
      const parsed = parseInt(String(relatedSystemIdRaw), 10);
      if (!isNaN(parsed)) relatedSystemIdFilter = parsed;
    }

    // Build Where Clause
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { requester: { name: { contains: search, mode: "insensitive" } } },
        { requester: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (statusFilter) {
      whereClause.currentStatus = { equals: statusFilter, mode: "insensitive" };
    }

    if (itPriorityFilter) {
      if (["NONE", "UNASSIGNED", "NULL"].includes(itPriorityFilter.toUpperCase())) {
        whereClause.itPriority = null;
      } else {
        whereClause.itPriority = { equals: itPriorityFilter, mode: "insensitive" };
      }
    }

    if (assignmentFilter === "unassigned") {
      whereClause.assignedToId = null;
    } else if (assignmentFilter === "me") {
      whereClause.assignedToId = sessionUser.id;
    } else if (assignmentFilter === "assigned") {
      whereClause.assignedToId = { not: null };
    } else if (assignedToIdFilter !== undefined) {
      whereClause.assignedToId = assignedToIdFilter;
    }

    if (categoryIdFilter !== undefined) {
      whereClause.categoryId = categoryIdFilter;
    }

    if (relatedSystemIdFilter !== undefined) {
      whereClause.relatedSystemId = relatedSystemIdFilter;
    }

    const rawTickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            attachments: { where: { isDeleted: false } },
            publicComments: true,
            internalNotes: true,
          },
        },
      },
    });

    // Custom Sorting for Staff Queue
    const compareItPriority = (pA: string | null | undefined, pB: string | null | undefined, isAscending: boolean): number => {
      if (!pA && !pB) return 0;
      if (!pA) return 1;
      if (!pB) return -1;
      const getRank = (p: string): number => {
        const up = p.toLowerCase();
        if (up === "urgent") return 1;
        if (up === "high") return 2;
        if (up === "medium") return 3;
        if (up === "low") return 4;
        return 5;
      };
      return isAscending ? getRank(pB) - getRank(pA) : getRank(pA) - getRank(pB);
    };

    const compareStatus = (sA: string | null | undefined, sB: string | null | undefined, isAscending: boolean): number => {
      const getRank = (s: string | null | undefined): number => {
        if (!s) return 10;
        const lower = s.toLowerCase();
        if (lower === "new") return 1;
        if (lower === "open") return 2;
        if (lower === "in progress") return 3;
        if (lower === "waiting for requester") return 4;
        if (lower === "pending verification") return 5;
        if (lower === "reopened") return 6;
        if (lower === "resolved") return 7;
        if (lower === "closed") return 8;
        if (lower === "cancelled") return 9;
        return 10;
      };
      return isAscending ? getRank(sA) - getRank(sB) : getRank(sB) - getRank(sA);
    };

    const compareCreatedAt = (cA: Date, cB: Date, isAscending: boolean): number => {
      const diff = new Date(cA).getTime() - new Date(cB).getTime();
      return isAscending ? diff : -diff;
    };

    rawTickets.sort((a, b) => {
      let comp = 0;
      if (sortBy === "itPriority") {
        comp = compareItPriority(a.itPriority, b.itPriority, isAsc);
      } else if (sortBy === "currentStatus" || sortBy === "status") {
        comp = compareStatus(a.currentStatus, b.currentStatus, isAsc);
      } else {
        comp = compareCreatedAt(a.createdAt, b.createdAt, isAsc);
      }

      if (comp !== 0) return comp;
      return a.ticketNumber.localeCompare(b.ticketNumber);
    });

    const total = rawTickets.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginated = rawTickets.slice(startIndex, startIndex + pageSize);

    const meta = {
      total,
      page,
      pageSize,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return res.status(200).json({
      data: paginated,
      meta,
      pagination: meta,
    });
  } catch (error) {
    console.error("Error loading staff queue:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load staff queue." },
    });
  }
});

// ---------------------------------------------------------------------------
// Claim Ticket API — PATCH /api/tickets/:id/claim (F-04)
// ---------------------------------------------------------------------------
app.patch("/api/tickets/:id/claim", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    if (ticket.assignedToId && ticket.assignedToId !== sessionUser.id && sessionUser.role !== "ADMINISTRATOR") {
      return res.status(409).json({
        error: {
          code: "TICKET_ALREADY_ASSIGNED",
          message: "This ticket has already been claimed by another IT staff member.",
        },
      });
    }

    const nextStatus = ticket.currentStatus === "New" ? "Open" : ticket.currentStatus;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: sessionUser.id,
        currentStatus: nextStatus,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ data: updated, ...updated });
  } catch (error) {
    console.error("Error claiming ticket:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to claim ticket." },
    });
  }
});

// ---------------------------------------------------------------------------
// Assign Ticket API — PATCH /api/tickets/:id/assign (F-04)
// ---------------------------------------------------------------------------
app.patch("/api/tickets/:id/assign", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const { assignedToId } = req.body;
    let targetStaffId: number | null = null;

    if (assignedToId !== null && assignedToId !== undefined) {
      targetStaffId = parseInt(String(assignedToId), 10);
      if (isNaN(targetStaffId)) {
        return res.status(422).json({
          error: { code: "VALIDATION_ERROR", message: "assignedToId must be a valid integer or null." },
        });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetStaffId } });
      if (!targetUser || !targetUser.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(targetUser.role)) {
        return res.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Assigned user does not exist, is inactive, or is not an IT staff member.",
          },
        });
      }
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    const nextStatus = (targetStaffId !== null && ticket.currentStatus === "New") ? "Open" : ticket.currentStatus;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: targetStaffId,
        currentStatus: nextStatus,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ data: updated, ...updated });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to assign ticket." },
    });
  }
});

// ---------------------------------------------------------------------------
// Set IT Priority API — PATCH /api/tickets/:id/priority (F-04)
// ---------------------------------------------------------------------------
app.patch("/api/tickets/:id/priority", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const { itPriority } = req.body;
    let normalizedPriority: string | null = null;

    if (itPriority !== null && itPriority !== undefined) {
      const prioStr = String(itPriority).trim();
      const ALLOWED = ["Urgent", "High", "Medium", "Low"];
      const match = ALLOWED.find((p) => p.toLowerCase() === prioStr.toLowerCase());

      if (!match) {
        return res.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "itPriority must be one of Urgent, High, Medium, Low, or null.",
          },
        });
      }
      normalizedPriority = match;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: normalizedPriority },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ data: updated, ...updated });
  } catch (error) {
    console.error("Error updating IT priority:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to update IT priority." },
    });
  }
});

// ---------------------------------------------------------------------------
// Update Ticket Status API — PATCH /api/tickets/:id/status (F-04)
// ---------------------------------------------------------------------------
app.patch("/api/tickets/:id/status", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(422).json({
        error: { code: "VALIDATION_ERROR", message: "Status is required." },
      });
    }

    const ALLOWED_STATUSES = [
      "New",
      "Open",
      "In Progress",
      "Waiting for Requester",
      "Pending Verification",
      "Resolved",
      "Closed",
      "Reopened",
      "Cancelled",
    ];

    const matchStatus = ALLOWED_STATUSES.find((s) => s.toLowerCase() === String(status).trim().toLowerCase());
    if (!matchStatus) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid status value. Allowed statuses: ${ALLOWED_STATUSES.join(", ")}`,
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    let isRequesterResolved = ticket.isRequesterResolved;
    if (ticket.currentStatus === "Pending Verification" && matchStatus !== "Pending Verification") {
      isRequesterResolved = false;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentStatus: matchStatus,
        isRequesterResolved,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ data: updated, ...updated });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to update status." },
    });
  }
});

// ---------------------------------------------------------------------------
// Ticket Detail API — GET /api/tickets/:id (F-09 & Lab 3 F-03)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;

    // 1. Validate ID param
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid ticket ID parameter.",
        },
      });
    }

    // 2. Query Ticket with relations and active/soft-deleted attachments
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileSize: true,
            isDeleted: true,
            removalReason: true,
            deletedAt: true,
            createdAt: true,
          },
          orderBy: [{ isDeleted: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "The requested ticket could not be found.",
        },
      });
    }

    // 3. Ownership Validation for Requesters (BR-06, AC-04)
    if (sessionUser.role === "REQUESTER" && ticket.requesterId !== sessionUser.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view this ticket.",
        },
      });
    }

    return res.status(200).json({ data: ticket });
  } catch (error) {
    console.error("Error loading ticket detail:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load ticket detail.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Requester Resolution Request API — PATCH /api/tickets/:id/resolve-indication
// ---------------------------------------------------------------------------
app.patch("/api/tickets/:id/resolve-indication", requireAuth, requireRole("REQUESTER"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    if (ticket.requesterId !== sessionUser.id) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to modify this ticket." },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isRequesterResolved: true,
        currentStatus: "Pending Verification",
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileSize: true,
            isDeleted: true,
            removalReason: true,
            deletedAt: true,
            createdAt: true,
          },
          orderBy: [{ isDeleted: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error("Error setting resolve indication:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to update resolution indication." },
    });
  }
});

// ---------------------------------------------------------------------------
// Ticket Creation API — POST /api/tickets (F-05 & Lab 3 F-03)
// ---------------------------------------------------------------------------
app.post("/api/tickets", requireAuth, upload.array("attachments", 10), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;

    // 1. Parse Fields & Bind Authenticated Requester Identity (FR-07, BR-03)
    const requesterId = sessionUser.id;
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
      prisma.user.findUnique({ where: { id: requesterId } }),
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

// ---------------------------------------------------------------------------
// Add Attachment to Existing Ticket — POST /api/tickets/:id/attachments (F-10)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);
    const requesterId = sessionUser.role === "REQUESTER" ? sessionUser.id : parseInt(String(req.body.requesterId || req.query.requesterId), 10);

    if (isNaN(ticketId) || isNaN(requesterId)) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Ticket ID and Requester ID are required." },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { attachments: { where: { isDeleted: false } } },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to modify this ticket." },
      });
    }

    if (ticket.attachments.length >= 5) {
      return res.status(409).json({
        error: {
          code: "ATTACHMENT_LIMIT_REACHED",
          message: "This ticket already has the maximum number of active attachments.",
        },
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Attachment file is required." },
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(413).json({
        error: { code: "ATTACHMENT_TOO_LARGE", message: "The attachment exceeds the 5 MB size limit." },
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(415).json({
        error: { code: "ATTACHMENT_TYPE_NOT_ALLOWED", message: "This attachment type is not supported." },
      });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
      },
      select: {
        id: true,
        ticketId: true,
        fileName: true,
        contentType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ data: attachment });
  } catch (error) {
    console.error("Error adding attachment:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to add attachment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Download Active Attachment — GET /api/attachments/:id/download (F-10)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachmentId = parseInt(req.params.id, 10);
    const requesterId = parseInt(String(req.query.requesterId), 10);

    if (isNaN(attachmentId) || isNaN(requesterId)) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Attachment ID and Requester ID are required." },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        error: { code: "ATTACHMENT_NOT_FOUND", message: "The requested attachment could not be found." },
      });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to access this attachment." },
      });
    }

    const safeFilename = encodeURIComponent(attachment.fileName);
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader("Content-Length", attachment.fileSize);
    return res.status(200).send(attachment.fileData);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to download attachment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Preview Active Attachment — GET /api/attachments/:id/preview (F-10)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/preview", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachmentId = parseInt(req.params.id, 10);
    const requesterId = parseInt(String(req.query.requesterId), 10);

    if (isNaN(attachmentId) || isNaN(requesterId)) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Attachment ID and Requester ID are required." },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        error: { code: "ATTACHMENT_NOT_FOUND", message: "The requested attachment could not be found." },
      });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to access this attachment." },
      });
    }

    const safeFilename = encodeURIComponent(attachment.fileName);
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader("Content-Length", attachment.fileSize);
    return res.status(200).send(attachment.fileData);
  } catch (error) {
    console.error("Error previewing attachment:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to preview attachment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Soft-Remove Attachment — DELETE /api/attachments/:id (F-10)
// ---------------------------------------------------------------------------
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachmentId = parseInt(req.params.id, 10);
    const requesterId = parseInt(String(req.body.requesterId || req.query.requesterId), 10);
    const reasonRaw = req.body.reason ? String(req.body.reason).trim() : "";

    if (isNaN(attachmentId) || isNaN(requesterId)) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Attachment ID and Requester ID are required." },
      });
    }

    if (!reasonRaw) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Removal reason is required.",
          details: [{ field: "reason", message: "Removal reason is required." }],
        },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        error: { code: "ATTACHMENT_NOT_FOUND", message: "The requested attachment could not be found." },
      });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to remove this attachment." },
      });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isDeleted: true,
        removalReason: reasonRaw,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        isDeleted: true,
        removalReason: true,
        deletedAt: true,
      },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error("Error removing attachment:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to remove attachment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Public Comments API — GET / POST /api/tickets/:id/comments
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    if (sessionUser.role === "REQUESTER" && ticket.requesterId !== sessionUser.id) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to view comments for this ticket." },
      });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ data: comments });
  } catch (error) {
    console.error("Error loading public comments:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load public comments." },
    });
  }
});

app.post("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    if (sessionUser.role === "REQUESTER" && ticket.requesterId !== sessionUser.id) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have permission to comment on this ticket." },
      });
    }

    const content = req.body.content ? String(req.body.content).trim() : "";
    if (!content) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Comment content cannot be empty.",
          details: [{ field: "content", message: "Content is required." }],
        },
      });
    }

    if (content.length > 2000) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Comment content cannot exceed 2000 characters.",
        },
      });
    }

    const comment = await prisma.publicComment.create({
      data: {
        ticketId,
        authorId: sessionUser.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    return res.status(201).json({ data: comment });
  } catch (error) {
    console.error("Error posting public comment:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to post public comment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Confidential Internal Notes API — GET / POST /api/tickets/:id/notes
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id/notes", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ data: notes });
  } catch (error) {
    console.error("Error loading internal notes:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load internal notes." },
    });
  }
});

app.post("/api/tickets/:id/notes", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const sessionUser = req.session.user!;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId < 1) {
      return res.status(400).json({
        error: { code: "INVALID_QUERY", message: "Invalid ticket ID parameter." },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "The requested ticket could not be found." },
      });
    }

    const content = req.body.content ? String(req.body.content).trim() : "";
    if (!content) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Internal note content cannot be empty.",
          details: [{ field: "content", message: "Content is required." }],
        },
      });
    }

    if (content.length > 2000) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Internal note content cannot exceed 2000 characters.",
        },
      });
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: sessionUser.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    return res.status(201).json({ data: note });
  } catch (error) {
    console.error("Error posting internal note:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to post internal note." },
    });
  }
});

// ---------------------------------------------------------------------------
// User Management & Staff Selection API — GET /api/users
// ---------------------------------------------------------------------------
app.get("/api/users", requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const roleFilter = req.query.role ? String(req.query.role).trim().toUpperCase() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const whereClause: any = {};
    if (roleFilter && ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(roleFilter)) {
      whereClause.role = roleFilter;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error loading users list:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load users list." },
    });
  }
});

// ---------------------------------------------------------------------------
// Centralized Error Handling Middleware (including Multer errors)
// ---------------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Attachment exceeds size limit.",
        },
      });
    }
    return res.status(400).json({
      error: {
        code: "INVALID_UPLOAD",
        message: err.message,
      },
    });
  }

  console.error("Unhandled server error:", err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected internal server error occurred.",
    },
  });
});

export default app;
