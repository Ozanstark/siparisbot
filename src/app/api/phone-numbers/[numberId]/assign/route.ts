import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/phone-numbers/[numberId]/assign - Assign phone number to customer
export async function POST(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user
  const { numberId } = params

  // Only admins can assign phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Verify phone number exists and belongs to organization
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    // Verify user exists and belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: "CUSTOMER"
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Assign phone number to customer
    const updatedPhoneNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: { assignedToUserId: userId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      phoneNumber: updatedPhoneNumber
    })
  } catch (error) {
    console.error("Error assigning phone number:", error)
    return NextResponse.json(
      { error: "Failed to assign phone number" },
      { status: 500 }
    )
  }
}

// DELETE /api/phone-numbers/[numberId]/assign - Unassign phone number from customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user
  const { numberId } = params

  // Only admins can unassign phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    // Verify phone number exists and belongs to organization
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    // Unassign phone number
    const updatedPhoneNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: { assignedToUserId: null },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      phoneNumber: updatedPhoneNumber
    })
  } catch (error) {
    console.error("Error unassigning phone number:", error)
    return NextResponse.json(
      { error: "Failed to unassign phone number" },
      { status: 500 }
    )
  }
}
