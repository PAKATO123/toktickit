import { getPrisma } from "../src/prisma.js";

const SEED_TICKET_NUMBERS = [
  "TICK-2026-0001",
  "TICK-2026-0002",
  "TICK-2026-0003",
  "TICK-2026-0004",
  "TICK-2026-0005",
  "TICK-2026-0006",
  "TICK-2026-0007",
  "TICK-2026-0008",
  "TICK-2026-0009",
  "TICK-2026-0010",
  "TICK-2026-0011",
  "TICK-2026-0012",
  "TICK-2026-0013",
  "TICK-2026-0014",
  "TICK-2026-0015",
];

export default async function teardown() {
  const prisma = getPrisma();
  try {
    await prisma.attachment.deleteMany({
      where: {
        ticket: {
          ticketNumber: {
            notIn: SEED_TICKET_NUMBERS,
          },
        },
      },
    });

    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: {
          notIn: SEED_TICKET_NUMBERS,
        },
      },
    });
  } catch (error) {
    console.error("Error in test teardown cleanup:", error);
  }
}
