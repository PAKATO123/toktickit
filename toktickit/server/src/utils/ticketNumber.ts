import { PrismaClient } from "@prisma/client";

/**
 * Generates official ticket numbers in format TICK-YYYY-NNNN (BR-01).
 * E.g., TICK-2026-0001
 */
export async function generateTicketNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `TICK-${year}-`;

  // Find latest ticket for current year
  const lastTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastTicket && lastTicket.ticketNumber) {
    const parts = lastTicket.ticketNumber.split("-");
    const seqStr = parts[parts.length - 1];
    const parsedSeq = parseInt(seqStr, 10);
    if (!isNaN(parsedSeq)) {
      nextSequence = parsedSeq + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, "0");
  return `${prefix}${paddedSequence}`;
}
