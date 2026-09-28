import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Lab 03 Feature 1 — Schema & Seed Verification", () => {
  const prisma = getPrisma();

  it("seeds 10 total User accounts across required roles", async () => {
    const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
    expect(users.length).toBe(10);

    const requesters = users.filter((u) => u.role === "REQUESTER");
    const staff = users.filter((u) => u.role === "IT_STAFF");
    const admins = users.filter((u) => u.role === "ADMINISTRATOR");

    expect(requesters.length).toBe(5);
    expect(staff.length).toBe(4);
    expect(admins.length).toBe(1);
  });

  it("seeds active and inactive user accounts per role requirements", async () => {
    const activeRequesters = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: true } });
    const inactiveRequesters = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: false } });

    const activeStaff = await prisma.user.findMany({ where: { role: "IT_STAFF", isActive: true } });
    const inactiveStaff = await prisma.user.findMany({ where: { role: "IT_STAFF", isActive: false } });

    const activeAdmin = await prisma.user.findMany({ where: { role: "ADMINISTRATOR", isActive: true } });

    expect(activeRequesters.length).toBe(4);
    expect(inactiveRequesters.length).toBe(1);
    expect(inactiveRequesters[0].email).toBe("requester5@toktickit.local");

    expect(activeStaff.length).toBe(3);
    expect(inactiveStaff.length).toBe(1);
    expect(inactiveStaff[0].email).toBe("staff4@toktickit.local");

    expect(activeAdmin.length).toBe(1);
    expect(activeAdmin[0].email).toBe("admin@toktickit.local");
  });

  it("hashes stored user passwords and sets mandatory password change flags", async () => {
    const requester = await prisma.user.findUnique({ where: { email: "requester1@toktickit.local" } });
    expect(requester).not.toBeNull();
    expect(requester!.passwordHash).not.toBe("Password123!");
    expect(bcrypt.compareSync("Password123!", requester!.passwordHash)).toBe(true);
    expect(requester!.mustChangePassword).toBe(true);

    const admin = await prisma.user.findUnique({ where: { email: "admin@toktickit.local" } });
    expect(admin).not.toBeNull();
    expect(bcrypt.compareSync("AdminPassword123!", admin!.passwordHash)).toBe(true);
    expect(admin!.mustChangePassword).toBe(false);
  });

  it("seeds Tickets linked to Users with assigned staff, priority, comments, and notes", async () => {
    const tickets = await prisma.ticket.findMany({
      include: {
        requester: true,
        assignedTo: true,
        publicComments: true,
        internalNotes: true,
      },
    });

    expect(tickets.length).toBeGreaterThanOrEqual(10);
    expect(tickets.every((t) => t.requester !== null)).toBe(true);

    const assignedTickets = tickets.filter((t) => t.assignedTo !== null);
    expect(assignedTickets.length).toBeGreaterThan(0);
    expect(assignedTickets[0].assignedTo?.role).toMatch(/IT_STAFF|ADMINISTRATOR/);

    const ticketWithComments = tickets.find((t) => t.publicComments.length > 0);
    expect(ticketWithComments).toBeDefined();

    const ticketWithNotes = tickets.find((t) => t.internalNotes.length > 0);
    expect(ticketWithNotes).toBeDefined();
    expect(ticketWithNotes!.internalNotes[0].content).toContain("Confidential Note");
  });

  it("supports Pending Verification status and isRequesterResolved flag", async () => {
    const pendingTicket = await prisma.ticket.findFirst({
      where: { currentStatus: "Pending Verification" },
    });

    expect(pendingTicket).not.toBeNull();
    expect(pendingTicket!.isRequesterResolved).toBe(true);
  });
});
