import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        // Check if admin already exists to avoid accidental re-seeding
        const existingAdmin = await prisma.user.findUnique({
            where: { email: "admin@demo.com" }
        })

        if (existingAdmin) {
            return NextResponse.json({ message: "Database already seeded" })
        }

        // Create organization
        const org = await prisma.organization.upsert({
            where: { slug: "demo-org" },
            update: {},
            create: {
                name: "Demo Organization",
                slug: "demo-org",
                // Optional: Add default Retell keys if you have them, otherwise null
            },
        })

        // Create admin user
        const adminPassword = await bcrypt.hash("admin123", 10)
        await prisma.user.upsert({
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

        // Create customer users
        const customerPassword = await bcrypt.hash("customer123", 10)
        await prisma.user.upsert({
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

        await prisma.user.upsert({
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

        // Create demo phone number
        await prisma.phoneNumber.upsert({
            where: { number: "+14155551234" },
            update: {},
            create: {
                number: "+14155551234",
                nickname: "Main Line",
                organizationId: org.id,
                isActive: true,
            },
        })

        return NextResponse.json({
            success: true,
            message: "Database seeded successfully!",
            credentials: {
                admin: { email: "admin@demo.com", password: "admin123" }
            }
        })

    } catch (error) {
        console.error("Seeding error:", error)
        return NextResponse.json({ error: "Failed to seed database", details: String(error) }, { status: 500 })
    }
}
