import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting seed...")

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
    },
  })

  console.log("✓ Created organization:", org.name)

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin User",
      hashedPassword: adminPassword,
      role: Role.ADMIN,
      organizationId: org.id,
    },
  })

  console.log("✓ Created admin user:", admin.email)

  // Create customer users
  const customerPassword = await bcrypt.hash("customer123", 10)
  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@demo.com" },
    update: {},
    create: {
      email: "customer1@demo.com",
      name: "Customer One",
      hashedPassword: customerPassword,
      role: Role.CUSTOMER,
      organizationId: org.id,
    },
  })

  const customer2 = await prisma.user.upsert({
    where: { email: "customer2@demo.com" },
    update: {},
    create: {
      email: "customer2@demo.com",
      name: "Customer Two",
      hashedPassword: customerPassword,
      role: Role.CUSTOMER,
      organizationId: org.id,
    },
  })

  console.log("✓ Created customer users")

  // Create phone number
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: { number: "+14155551234" },
    update: {},
    create: {
      number: "+14155551234",
      nickname: "Main Line",
      organizationId: org.id,
      isActive: true,
    },
  })

  console.log("✓ Created phone number:", phoneNumber.number)

  console.log("\n✅ Seed data created successfully!")
  console.log("\n📋 Login credentials:")
  console.log("   Admin     → email: admin@demo.com,     password: admin123")
  console.log("   Customer1 → email: customer1@demo.com, password: customer123")
  console.log("   Customer2 → email: customer2@demo.com, password: customer123")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
