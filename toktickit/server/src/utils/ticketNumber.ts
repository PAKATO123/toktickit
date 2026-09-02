import { PrismaClient } from "@prisma/client";

/**
 * Generates official ticket numbers in format TICK-YYYY-NNNN (BR-01).
 * E.g., TICK-2026-0001
 */
export async function generateTicketNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `TICK-${year}-`;

  const tickets = await prisma.ticket.findMany({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    select: {
      ticketNumber: true,
    },
  });

  let maxSeq = 0;
  for (const t of tickets) {
    const parts = t.ticketNumber.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSequence = maxSeq + 1;
  const paddedSequence = String(nextSequence).padStart(4, "0");
  return `${prefix}${paddedSequence}`;
}
