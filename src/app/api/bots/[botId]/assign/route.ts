import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/bots/[botId]/assign - Admin assigns bot to customer
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { botId } = params

  try {
    const body = await req.json()
    const { userId } = body

    // Verify bot belongs to organization
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Verify user belongs to organization and is a customer
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

    // Create assignment (upsert to avoid duplicates)
    const assignment = await prisma.botAssignment.upsert({
      where: {
        botId_userId: { botId, userId }
      },
      create: { botId, userId },
      update: {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        bot: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Error assigning bot:", error)
    return NextResponse.json(
      { error: "Failed to assign bot" },
      { status: 500 }
    )
  }
}

// DELETE /api/bots/[botId]/assign - Unassign bot from customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { botId } = params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  try {
    // Verify bot belongs to organization
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    await prisma.botAssignment.delete({
      where: { botId_userId: { botId, userId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unassigning bot:", error)
    return NextResponse.json(
      { error: "Failed to unassign bot" },
      { status: 500 }
    )
  }
}
