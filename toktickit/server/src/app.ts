import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
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


import multer from "multer";
import { generateTicketNumber } from "./utils/ticketNumber.js";
import { isRateLimited, recordTicketCreation } from "./utils/rateLimiter.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB soft limit for multer parser (5MB strict validation in route)
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (BR-27)
const ALLOWED_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

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


