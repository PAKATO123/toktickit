import { getPrisma } from "../src/prisma.js";

const CATEGORIES = [
  { name: "Account and Access", isActive: true },
  { name: "Hardware", isActive: true },
  { name: "Software", isActive: true },
  { name: "Network", isActive: true },
];

const REQUESTERS = [
  { name: "Alice Chen", email: "alice.chen@example.com", department: "Engineering", isActive: true },
  { name: "Bob Smith", email: "bob.smith@example.com", department: "Marketing", isActive: true },
  { name: "Carlos Ray", email: "carlos.ray@example.com", department: "Finance", isActive: true },
  { name: "Diana Prince", email: "diana.prince@example.com", department: "Operations", isActive: true },
  { name: "Eve Inactive", email: "eve.inactive@example.com", department: "Contractor", isActive: false },
];

const RELATED_SYSTEMS = [
  { name: "Email & Collaboration", description: "Email, calendar, chat, and documentation tools", isActive: true },
  { name: "VPN & Remote Access", description: "Secure remote connectivity and gateway services", isActive: true },
  { name: "HR & Payroll Portal", description: "Employee self-service, benefits, and payroll management", isActive: true },
  { name: "Financial & Billing System", description: "Accounting, expense tracking, and invoicing platform", isActive: true },
  { name: "CRM & Customer Support", description: "Customer relationship management and support desk", isActive: true },
  { name: "ERP & Operations", description: "Enterprise resource planning and supply chain tracking", isActive: true },
];

const SEED_TICKETS = [
  {
    ticketNumber: "TICK-2026-0001",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Account and Access",
    systemName: "Email & Collaboration",
    summary: "Critical email access lockout during launch",
    description: "I am completely locked out of my corporate email account during our major product launch.",
    requestedPriority: "URGENT",
    currentStatus: "In Progress",
  },
  {
    ticketNumber: "TICK-2026-0002",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Hardware",
    systemName: "VPN & Remote Access",
    summary: "External monitor flickering violently",
    description: "My dual monitor setup flickers uncontrollably whenever I open IDE software.",
    requestedPriority: "HIGH",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0003",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Software",
    systemName: "Financial & Billing System",
    summary: "Expense report export failing with 500 error",
    description: "Exporting monthly expense report CSV results in an unhandled backend exception.",
    requestedPriority: "MEDIUM",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0004",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Network",
    systemName: "VPN & Remote Access",
    summary: "VPN connection disconnects every 15 minutes",
    description: "The corporate VPN disconnects automatically after 15 minutes of continuous usage.",
    requestedPriority: "LOW",
    currentStatus: "Resolved",
  },
  {
    ticketNumber: "TICK-2026-0005",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Account and Access",
    systemName: "HR & Payroll Portal",
    summary: "Update direct deposit bank account details",
    description: "Need help updating my direct deposit bank routing number for the upcoming payroll run.",
    requestedPriority: null,
    currentStatus: "Closed",
  },
  {
    ticketNumber: "TICK-2026-0006",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Software",
    systemName: "CRM & Customer Support",
    summary: "CRM dashboard charts not loading metrics",
    description: "The analytics charts on the main CRM dashboard display blank loading placeholders indefinitely.",
    requestedPriority: "URGENT",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0007",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Hardware",
    systemName: "Email & Collaboration",
    summary: "Replacement wireless mouse needed",
    description: "My current Bluetooth mouse roller wheel broke down during editing.",
    requestedPriority: "LOW",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0008",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Account and Access",
    systemName: "ERP & Operations",
    summary: "Requesting admin role for ERP staging environment",
    description: "Need administrative permissions on the staging ERP instance for running migration tests.",
    requestedPriority: "HIGH",
    currentStatus: "In Progress",
  },
  {
    ticketNumber: "TICK-2026-0009",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Network",
    systemName: "Email & Collaboration",
    summary: "Wi-Fi connectivity slow in 4th floor conference room",
    description: "Wireless network latency spikes to over 800ms during team video syncs.",
    requestedPriority: "MEDIUM",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0010",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Software",
    systemName: "HR & Payroll Portal",
    summary: "PTO balance calculation discrepancy",
    description: "My accrued paid time off shows 2 days fewer than my approved rollover balance.",
    requestedPriority: null,
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0011",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Account and Access",
    systemName: "Financial & Billing System",
    summary: "Password reset for billing portal",
    description: "Forgotten security questions for billing portal login page.",
    requestedPriority: "HIGH",
    currentStatus: "Resolved",
  },
  {
    ticketNumber: "TICK-2026-0012",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Hardware",
    systemName: "ERP & Operations",
    summary: "Laptop battery draining in 45 minutes",
    description: "My developer laptop battery health degraded and drains completely under light load.",
    requestedPriority: "URGENT",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0013",
    requesterEmail: "alice.chen@example.com",
    categoryName: "Software",
    systemName: "Email & Collaboration",
    summary: "Slack integration notification delay",
    description: "GitHub commit webhook notifications in Slack channels arrive with a 30-minute delay.",
    requestedPriority: "LOW",
    currentStatus: "New",
  },

  // Bob Smith tickets
  {
    ticketNumber: "TICK-2026-0014",
    requesterEmail: "bob.smith@example.com",
    categoryName: "Account and Access",
    systemName: "CRM & Customer Support",
    summary: "Bob marketing permissions update",
    description: "Requesting lead management access permissions in CRM.",
    requestedPriority: "HIGH",
    currentStatus: "New",
  },
  {
    ticketNumber: "TICK-2026-0015",
    requesterEmail: "bob.smith@example.com",
    categoryName: "Software",
    systemName: "Email & Collaboration",
    summary: "Canva Pro license transfer request",
    description: "Please transfer the design software license to my corporate marketing email.",
    requestedPriority: "MEDIUM",
    currentStatus: "In Progress",
  },
];

async function main() {
  const prisma = getPrisma();

  const categoryMap = new Map<string, number>();
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: cat.isActive },
      create: { name: cat.name, isActive: cat.isActive },
    });
    categoryMap.set(cat.name, record.id);
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  const requesterMap = new Map<string, number>();
  for (const req of REQUESTERS) {
    const record = await prisma.requester.upsert({
      where: { email: req.email },
      update: { name: req.name, department: req.department, isActive: req.isActive },
      create: { name: req.name, email: req.email, department: req.department, isActive: req.isActive },
    });
    requesterMap.set(req.email, record.id);
  }
  console.log(`Seeded ${REQUESTERS.length} requesters.`);

  const systemMap = new Map<string, number>();
  for (const sys of RELATED_SYSTEMS) {
    const record = await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: sys.isActive },
      create: { name: sys.name, description: sys.description, isActive: sys.isActive },
    });
    systemMap.set(sys.name, record.id);
  }
  console.log(`Seeded ${RELATED_SYSTEMS.length} related systems.`);

  for (const t of SEED_TICKETS) {
    const requesterId = requesterMap.get(t.requesterEmail)!;
    const categoryId = categoryMap.get(t.categoryName)!;
    const relatedSystemId = systemMap.get(t.systemName)!;

    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        requesterId,
        categoryId,
        relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        currentStatus: t.currentStatus,
      },
      create: {
        ticketNumber: t.ticketNumber,
        requesterId,
        categoryId,
        relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        currentStatus: t.currentStatus,
      },
    });
  }
  console.log(`Seeded ${SEED_TICKETS.length} tickets with diverse priorities and statuses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
