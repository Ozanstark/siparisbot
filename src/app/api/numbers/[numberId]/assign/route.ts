import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/numbers/[numberId]/assign - Assign number to customer (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { numberId } = params

  try {
    const body = await req.json()
    const { userId } = body

    // Verify number belongs to organization
    const number = await prisma.phoneNumber.findFirst({
      where: { id: numberId, organizationId }
    })

    if (!number) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
    }

    // Verify user is customer in same org
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: "CUSTOMER"
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Assign number
    const updatedNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: { assignedToUserId: userId }
    })

    return NextResponse.json({ number: updatedNumber })
  } catch (error) {
    console.error("Error assigning number:", error)
    return NextResponse.json(
      { error: "Failed to assign number" },
      { status: 500 }
    )
  }
}

// DELETE /api/numbers/[numberId]/assign - Unassign number (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { numberId } = params

  try {
    const number = await prisma.phoneNumber.findFirst({
      where: { id: numberId, organizationId }
    })

    if (!number) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
    }

    const updatedNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: { assignedToUserId: null }
    })

    return NextResponse.json({ number: updatedNumber })
  } catch (error) {
    console.error("Error unassigning number:", error)
    return NextResponse.json(
      { error: "Failed to unassign number" },
      { status: 500 }
    )
  }
}
