import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/bots/[botId]/versions - List all versions for a bot
export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { botId } = params

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

    // Fetch all versions
    const versions = await prisma.botVersion.findMany({
      where: { botId },
      orderBy: { versionNumber: "desc" }
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Error fetching bot versions:", error)
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    )
  }
}

// POST /api/bots/[botId]/versions - Create a new draft version
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { botId } = params

  // Only admins can create versions
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Get the next version number
    const latestVersion = await prisma.botVersion.findFirst({
      where: { botId },
      orderBy: { versionNumber: "desc" }
    })

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1

    // Create new draft version with provided data or current bot data
    const version = await prisma.botVersion.create({
      data: {
        botId,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
        name: body.name || bot.name,
        description: body.description || bot.description,
        voiceId: body.voiceId || bot.voiceId,
        model: body.model || bot.model,
        generalPrompt: body.generalPrompt || bot.generalPrompt,
        beginMessage: body.beginMessage || bot.beginMessage,
      }
    })

    return NextResponse.json({ version }, { status: 201 })
  } catch (error) {
    console.error("Error creating bot version:", error)
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    )
  }
}
