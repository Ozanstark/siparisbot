import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/bots/[botId]/versions/[versionId] - Get specific version
export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string; versionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { botId, versionId } = params

  try {
    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: { some: { userId } }
        })
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    const version = await prisma.botVersion.findFirst({
      where: { id: versionId, botId }
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error("Error fetching version:", error)
    return NextResponse.json(
      { error: "Failed to fetch version" },
      { status: 500 }
    )
  }
}

// PUT /api/bots/[botId]/versions/[versionId] - Update draft version
export async function PUT(
  req: NextRequest,
  { params }: { params: { botId: string; versionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user
  const { botId, versionId } = params

  try {
    const body = await req.json()

    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Get version and ensure it's a draft
    const version = await prisma.botVersion.findFirst({
      where: { id: versionId, botId }
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    if (version.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only update draft versions" },
        { status: 400 }
      )
    }

    // Update version
    const updatedVersion = await prisma.botVersion.update({
      where: { id: versionId },
      data: {
        name: body.name,
        description: body.description,
        voiceId: body.voiceId,
        model: body.model,
        generalPrompt: body.generalPrompt,
        beginMessage: body.beginMessage,
      }
    })

    return NextResponse.json({ version: updatedVersion })
  } catch (error) {
    console.error("Error updating version:", error)
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    )
  }
}

// DELETE /api/bots/[botId]/versions/[versionId] - Delete draft version
export async function DELETE(
  req: NextRequest,
  { params }: { params: { botId: string; versionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user
  const { botId, versionId } = params

  try {
    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Get version and ensure it's a draft
    const version = await prisma.botVersion.findFirst({
      where: { id: versionId, botId }
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    if (version.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft versions" },
        { status: 400 }
      )
    }

    await prisma.botVersion.delete({
      where: { id: versionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting version:", error)
    return NextResponse.json(
      { error: "Failed to delete version" },
      { status: 500 }
    )
  }
}
