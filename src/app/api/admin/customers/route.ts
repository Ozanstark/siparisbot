import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCustomerSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"
import { z } from "zod"


export const dynamic = "force-dynamic"
export const revalidate = 0

// GET /api/admin/customers - List customers (admin only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user

  try {
    const customers = await prisma.user.findMany({
      where: {
        organizationId,
        role: "CUSTOMER"
      },
      include: {
        assignedBots: {
          include: {
            bot: { select: { id: true, name: true } }
          }
        },
        initiatedCalls: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const customersWithStats = customers.map((customer) => ({
      ...customer,
      hashedPassword: undefined,
      assignedBotsCount: customer.assignedBots.length,
      callsCount: customer.initiatedCalls.length
    }))

    return NextResponse.json({ customers: customersWithStats })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

// POST /api/admin/customers - Create customer (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = createCustomerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create customer
    const customer = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        hashedPassword,
        role: "CUSTOMER",
        organizationId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}
