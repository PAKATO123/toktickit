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

const PRIORITIES: (string | null)[] = ["URGENT", "HIGH", "MEDIUM", "LOW", null];
const STATUSES = ["New", "In Progress", "Resolved", "Closed"];

const ISSUE_TEMPLATES = [
  { summary: "Critical email access lockout during launch", description: "I am completely locked out of my corporate email account during our major product launch." },
  { summary: "External monitor flickering violently", description: "My dual monitor setup flickers uncontrollably whenever I open IDE software." },
  { summary: "Expense report export failing with 500 error", description: "Exporting monthly expense report CSV results in an unhandled backend exception." },
  { summary: "VPN connection disconnects every 15 minutes", description: "The corporate VPN disconnects automatically after 15 minutes of continuous usage." },
  { summary: "Update direct deposit bank account details", description: "Need help updating my direct deposit bank routing number for the upcoming payroll run." },
  { summary: "CRM dashboard charts not loading metrics", description: "The analytics charts on the main CRM dashboard display blank loading placeholders indefinitely." },
  { summary: "Replacement wireless mouse needed", description: "My current Bluetooth mouse roller wheel broke down during editing." },
  { summary: "Requesting admin role for ERP staging environment", description: "Need administrative permissions on the staging ERP instance for running migration tests." },
  { summary: "Wi-Fi connectivity slow in 4th floor conference room", description: "Wireless network latency spikes to over 800ms during team video syncs." },
  { summary: "PTO balance calculation discrepancy", description: "My accrued paid time off shows 2 days fewer than my approved rollover balance." },
  { summary: "Password reset for billing portal", description: "Forgotten security questions for billing portal login page." },
  { summary: "Laptop battery draining in 45 minutes", description: "My developer laptop battery health degraded and drains completely under light load." },
  { summary: "Slack integration notification delay", description: "GitHub commit webhook notifications in Slack channels arrive with a 30-minute delay." },
  { summary: "Docker desktop container network gateway error", description: "Docker containers cannot resolve local internal DNS hostnames on macOS." },
  { summary: "Kibana log streaming index lifecycle policy issue", description: "Production application logs are not indexing into Elasticsearch indices." },
  { summary: "SSO multi-factor authentication SMS code not arriving", description: "MFA verification text messages fail to deliver to mobile device." },
  { summary: "Database connection pool exhausted during peak hours", description: "PostgreSQL server exceeds max connections during morning peak hours." },
  { summary: "SSL certificate expiration warning on internal staging", description: "Internal SSL wildcard certificate expires in 3 days." },
];

// 36 Total Tickets: Alice Chen (26), Bob Smith (5), Diana Prince (5), Carlos Ray (0 - empty)
const SEED_TICKETS = Array.from({ length: 36 }, (_, i) => {
  const seq = i + 1;
  const numStr = String(seq).padStart(4, "0");
  const ticketNumber = `TICK-2026-${numStr}`;
  
  // 26 for Alice Chen, 5 for Bob Smith, 5 for Diana Prince, 0 for Carlos Ray
  const requesterEmail = seq <= 26 ? "alice.chen@example.com" : seq <= 31 ? "bob.smith@example.com" : "diana.prince@example.com";
  const categoryName = CATEGORIES[i % CATEGORIES.length].name;
  const systemName = RELATED_SYSTEMS[i % RELATED_SYSTEMS.length].name;
  const tpl = ISSUE_TEMPLATES[i % ISSUE_TEMPLATES.length];
  const requestedPriority = PRIORITIES[i % PRIORITIES.length];
  const currentStatus = STATUSES[i % STATUSES.length];

  return {
    ticketNumber,
    requesterEmail,
    categoryName,
    systemName,
    summary: tpl.summary,
    description: tpl.description,
    requestedPriority,
    currentStatus,
  };
});

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
  console.log(`Seeded ${SEED_TICKETS.length} tickets (Alice Chen: 26, Bob Smith: 5, Diana Prince: 5, Carlos Ray: 0).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
