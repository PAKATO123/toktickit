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

async function main() {
  const prisma = getPrisma();

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: cat.isActive },
      create: { name: cat.name, isActive: cat.isActive },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  for (const req of REQUESTERS) {
    await prisma.requester.upsert({
      where: { email: req.email },
      update: { name: req.name, department: req.department, isActive: req.isActive },
      create: { name: req.name, email: req.email, department: req.department, isActive: req.isActive },
    });
  }
  console.log(`Seeded ${REQUESTERS.length} requesters.`);

  for (const sys of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: sys.isActive },
      create: { name: sys.name, description: sys.description, isActive: sys.isActive },
    });
  }
  console.log(`Seeded ${RELATED_SYSTEMS.length} related systems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });


