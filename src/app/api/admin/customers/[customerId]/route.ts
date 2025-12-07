import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"


export const dynamic = "force-dynamic"

// GET /api/admin/customers/[customerId] - Get customer details
export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { customerId } = params

  try {
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        organizationId,
        role: "CUSTOMER"
      },
      include: {
        assignedBots: {
          include: {
            bot: { select: { id: true, name: true, description: true } }
          }
        },
        initiatedCalls: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            bot: { select: { name: true } },
            analytics: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({
      customer: {
        ...customer,
        hashedPassword: undefined
      }
    })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/customers/[customerId] - Update customer
export async function PUT(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { customerId } = params

  try {
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        organizationId,
        role: "CUSTOMER"
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const body = await req.json()
    const { name, email, password } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (password) {
      updateData.hashedPassword = await bcrypt.hash(password, 10)
    }

    const updatedCustomer = await prisma.user.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ customer: updatedCustomer })
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/customers/[customerId] - Delete customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { customerId } = params

  try {
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        organizationId,
        role: "CUSTOMER"
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    await prisma.user.delete({ where: { id: customerId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    )
  }
}
