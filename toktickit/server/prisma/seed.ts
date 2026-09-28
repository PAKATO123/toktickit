import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("Password123!", 10);
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("AdminPassword123!", 10);

const CATEGORIES = [
  { name: "Account and Access", isActive: true },
  { name: "Hardware", isActive: true },
  { name: "Software", isActive: true },
  { name: "Network", isActive: true },
];

const RELATED_SYSTEMS = [
  { name: "Email & Collaboration", description: "Email, calendar, chat, and documentation tools", isActive: true },
  { name: "VPN & Remote Access", description: "Secure remote connectivity and gateway services", isActive: true },
  { name: "HR & Payroll Portal", description: "Employee self-service, benefits, and payroll management", isActive: true },
  { name: "Financial & Billing System", description: "Accounting, expense tracking, and invoicing platform", isActive: true },
  { name: "CRM & Customer Support", description: "Customer relationship management and support desk", isActive: true },
  { name: "ERP & Operations", description: "Enterprise resource planning and supply chain tracking", isActive: true },
];

const USERS = [
  // Requesters (4 active, 1 inactive)
  { email: "requester1@toktickit.local", name: "Alice Smith", role: "REQUESTER" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "requester2@toktickit.local", name: "Bob Johnson", role: "REQUESTER" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "requester3@toktickit.local", name: "Charlie Brown", role: "REQUESTER" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "requester4@toktickit.local", name: "Diana Prince", role: "REQUESTER" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "requester5@toktickit.local", name: "Eve Inactive", role: "REQUESTER" as const, isActive: false, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },

  // IT Staff (3 active, 1 inactive)
  { email: "staff1@toktickit.local", name: "Jane Staff", role: "IT_STAFF" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "staff2@toktickit.local", name: "Mark Tech", role: "IT_STAFF" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "staff3@toktickit.local", name: "Sarah Support", role: "IT_STAFF" as const, isActive: true, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },
  { email: "staff4@toktickit.local", name: "Tom Inactive Staff", role: "IT_STAFF" as const, isActive: false, mustChangePassword: true, passwordHash: DEFAULT_PASSWORD_HASH },

  // Administrator (1 active)
  { email: "admin@toktickit.local", name: "System Admin", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false, passwordHash: ADMIN_PASSWORD_HASH },
];

// Legacy Requester fallback entries
const LEGACY_REQUESTERS = [
  { name: "Alice Smith", email: "requester1@toktickit.local", department: "Engineering", isActive: true },
  { name: "Bob Johnson", email: "requester2@toktickit.local", department: "Marketing", isActive: true },
  { name: "Charlie Brown", email: "requester3@toktickit.local", department: "Finance", isActive: true },
  { name: "Diana Prince", email: "requester4@toktickit.local", department: "Operations", isActive: true },
  { name: "Eve Inactive", email: "requester5@toktickit.local", department: "Contractor", isActive: false },
];

const ISSUE_TEMPLATES = [
  { summary: "Critical email access lockout during launch", description: "I am completely locked out of my corporate email account during our major product launch.", reqPriority: "URGENT", itPriority: "Urgent", status: "New" },
  { summary: "External monitor flickering violently", description: "My dual monitor setup flickers uncontrollably whenever I open IDE software.", reqPriority: "MEDIUM", itPriority: "Medium", status: "Open" },
  { summary: "Expense report export failing with 500 error", description: "Exporting monthly expense report CSV results in an unhandled backend exception.", reqPriority: "HIGH", itPriority: "High", status: "In Progress" },
  { summary: "VPN connection disconnects every 15 minutes", description: "The corporate VPN disconnects automatically after 15 minutes of continuous usage.", reqPriority: "HIGH", itPriority: "High", status: "Waiting for Requester" },
  { summary: "Update direct deposit bank account details", description: "Need help updating my direct deposit bank routing number for the upcoming payroll run.", reqPriority: "LOW", itPriority: "Low", status: "Pending Verification", isRequesterResolved: true },
  { summary: "CRM dashboard charts not loading metrics", description: "The analytics charts on the main CRM dashboard display blank loading placeholders indefinitely.", reqPriority: "HIGH", itPriority: "High", status: "Resolved" },
  { summary: "Replacement wireless mouse needed", description: "My current Bluetooth mouse roller wheel broke down during editing.", reqPriority: "LOW", itPriority: "Low", status: "Closed" },
  { summary: "Requesting admin role for ERP staging environment", description: "Need administrative permissions on the staging ERP instance for running migration tests.", reqPriority: "HIGH", itPriority: "Medium", status: "Reopened" },
  { summary: "Wi-Fi connectivity slow in 4th floor conference room", description: "Wireless network latency spikes to over 800ms during team video syncs.", reqPriority: "MEDIUM", itPriority: "Medium", status: "Cancelled" },
  { summary: "PTO balance calculation discrepancy", description: "My accrued paid time off shows 2 days fewer than my approved rollover balance.", reqPriority: "LOW", itPriority: "Low", status: "New" },
];

async function main() {
  const prisma = getPrisma();

  // 1. Seed Users
  const userMap = new Map<string, number>();
  for (const user of USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordHash: user.passwordHash,
      },
      create: user,
    });
    userMap.set(user.email, record.id);
  }
  console.log(`Seeded ${USERS.length} User accounts.`);

  // 2. Seed Legacy Requesters
  for (const req of LEGACY_REQUESTERS) {
    await prisma.requester.upsert({
      where: { email: req.email },
      update: { name: req.name, department: req.department, isActive: req.isActive },
      create: req,
    });
  }
  console.log(`Seeded ${LEGACY_REQUESTERS.length} legacy requesters.`);

  // 3. Seed Categories
  const categoryMap = new Map<string, number>();
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: cat.isActive },
      create: cat,
    });
    categoryMap.set(cat.name, record.id);
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  // 4. Seed Related Systems
  const systemMap = new Map<string, number>();
  for (const sys of RELATED_SYSTEMS) {
    const record = await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: sys.isActive },
      create: sys,
    });
    systemMap.set(sys.name, record.id);
  }
  console.log(`Seeded ${RELATED_SYSTEMS.length} related systems.`);

  // 5. Seed Tickets
  const requesters = ["requester1@toktickit.local", "requester2@toktickit.local", "requester3@toktickit.local", "requester4@toktickit.local"];
  const staffList = ["staff1@toktickit.local", "staff2@toktickit.local", "staff3@toktickit.local"];

  for (let i = 0; i < ISSUE_TEMPLATES.length; i++) {
    const tpl = ISSUE_TEMPLATES[i];
    const ticketNumber = `TICK-2026-${String(i + 1).padStart(4, "0")}`;
    const requesterEmail = requesters[i % requesters.length];
    const requesterId = userMap.get(requesterEmail)!;

    // Assign some tickets to staff, leave some unassigned
    const assignedToEmail = i % 2 === 0 ? staffList[i % staffList.length] : null;
    const assignedToId = assignedToEmail ? userMap.get(assignedToEmail)! : null;

    const categoryId = categoryMap.get(CATEGORIES[i % CATEGORIES.length].name)!;
    const relatedSystemId = systemMap.get(RELATED_SYSTEMS[i % RELATED_SYSTEMS.length].name)!;

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {
        requesterId,
        assignedToId,
        categoryId,
        relatedSystemId,
        summary: tpl.summary,
        description: tpl.description,
        requestedPriority: tpl.reqPriority,
        itPriority: tpl.itPriority,
        currentStatus: tpl.status,
        isRequesterResolved: tpl.isRequesterResolved ?? false,
      },
      create: {
        ticketNumber,
        requesterId,
        assignedToId,
        categoryId,
        relatedSystemId,
        summary: tpl.summary,
        description: tpl.description,
        requestedPriority: tpl.reqPriority,
        itPriority: tpl.itPriority,
        currentStatus: tpl.status,
        isRequesterResolved: tpl.isRequesterResolved ?? false,
      },
    });

    // 6. Seed Public Comments & Internal Notes for assigned tickets
    if (assignedToId) {
      await prisma.publicComment.createMany({
        data: [
          { ticketId: ticket.id, authorId: requesterId, content: "Initial details updated per request." },
          { ticketId: ticket.id, authorId: assignedToId, content: "Thank you, we are currently investigating this issue." },
        ],
        skipDuplicates: true,
      });

      await prisma.internalNote.createMany({
        data: [
          { ticketId: ticket.id, authorId: assignedToId, content: "Confidential Note: Checked gateway logs and escalated to L2 team." },
        ],
        skipDuplicates: true,
      });
    }
  }
  console.log(`Seeded ${ISSUE_TEMPLATES.length} tickets with comments and internal notes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
