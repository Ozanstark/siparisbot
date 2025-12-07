import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/orders/[orderId] - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId } = session.user
  const { orderId } = params

  try {
    const body = await req.json()
    const { status } = body

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() })
      },
      include: {
        call: {
          select: {
            id: true,
            retellCallId: true,
            transcript: true,
            recordingUrl: true,
            createdAt: true
          }
        }
      }
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
