import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema for web call creation
const createWebCallSchema = z.object({
  botId: z.string().cuid(),
  metadata: z.record(z.string()).optional(),
})

// POST /api/calls/web - Create web call (browser-based)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const data = createWebCallSchema.parse(body)

    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: {
        id: data.botId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: { some: { userId } }
        })
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Get organization API key
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { retellApiKey: true }
    })

    if (!organization?.retellApiKey) {
      return NextResponse.json(
        { error: "Retell API key not configured" },
        { status: 400 }
      )
    }

    // Create web call via Retell using raw API
    const response = await fetch("https://api.retellai.com/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: bot.retellAgentId,
        metadata: {
          organizationId,
          userId,
          botId: data.botId,
          callType: "web",
          ...data.metadata
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const retellCall = await response.json()

    // Save to database
    const call = await prisma.call.create({
      data: {
        organizationId,
        botId: data.botId,
        initiatedById: userId,
        retellCallId: retellCall.call_id,
        status: "INITIATED",
        // Web calls don't have phone numbers
        toNumber: "web-call",
      },
      include: {
        bot: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({
      call,
      accessToken: retellCall.access_token, // Required for Retell Web SDK
      callId: retellCall.call_id,
      sampleRate: retellCall.sample_rate || 24000
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating web call:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create web call", details: (error as Error).message },
      { status: 500 }
    )
  }
}
