import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCallSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/calls - List calls (tenant-scoped)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { searchParams } = new URL(req.url)
  const botId = searchParams.get("botId")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  try {
    const calls = await prisma.call.findMany({
      where: {
        organizationId,
        ...(botId && { botId }),
        ...(role === "CUSTOMER" && {
          bot: {
            assignments: { some: { userId } }
          }
        })
      },
      include: {
        bot: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true, email: true } },
        analytics: true
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    })

    const total = await prisma.call.count({
      where: {
        organizationId,
        ...(botId && { botId }),
        ...(role === "CUSTOMER" && {
          bot: {
            assignments: { some: { userId } }
          }
        })
      }
    })

    return NextResponse.json({ calls, total, limit, offset })
  } catch (error) {
    console.error("Error fetching calls:", error)
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    )
  }
}

// POST /api/calls - Initiate new call
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const data = createCallSchema.parse(body)

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

    // Get phone number if provided
    let fromNumber: string | undefined
    if (data.fromNumberId) {
      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: {
          id: data.fromNumberId,
          organizationId,
          isActive: true
        }
      })

      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Phone number not found" },
          { status: 404 }
        )
      }
      fromNumber = phoneNumber.number
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

    // Build agent overrides if provided
    let agentOverrides: any = undefined
    if (data.overrides && Object.keys(data.overrides).length > 0) {
      agentOverrides = {}

      // Voice settings
      if (data.overrides.voiceId) agentOverrides.voice_id = data.overrides.voiceId
      if (data.overrides.voiceTemperature !== undefined) agentOverrides.voice_temperature = data.overrides.voiceTemperature
      if (data.overrides.voiceSpeed !== undefined) agentOverrides.voice_speed = data.overrides.voiceSpeed
      if (data.overrides.responsiveness !== undefined) agentOverrides.responsiveness = data.overrides.responsiveness
      if (data.overrides.interruptionSensitivity !== undefined) agentOverrides.interruption_sensitivity = data.overrides.interruptionSensitivity

      // LLM settings
      if (data.overrides.generalPrompt) agentOverrides.agent_name = data.overrides.generalPrompt // General prompt override
      if (data.overrides.beginMessage) agentOverrides.begin_message = data.overrides.beginMessage
      if (data.overrides.model) agentOverrides.llm_model = data.overrides.model
      if (data.overrides.temperature !== undefined) agentOverrides.temperature = data.overrides.temperature

      // Call duration limit
      if (data.overrides.maxDuration) agentOverrides.max_call_duration = data.overrides.maxDuration
    }

    // Create call via Retell using raw API
    const callPayload: any = {
      from_number: fromNumber,
      to_number: data.toNumber,
      override_agent_id: bot.retellAgentId,
      metadata: {
        organizationId,
        userId,
        botId: data.botId,
        ...data.metadata
      }
    }

    if (agentOverrides) {
      callPayload.agent_override = agentOverrides
    }

    const response = await fetch("https://api.retellai.com/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(callPayload)
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
        fromNumber,
        fromNumberId: data.fromNumberId,
        toNumber: data.toNumber,
        status: "INITIATED"
      },
      include: {
        bot: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({ call }, { status: 201 })
  } catch (error) {
    console.error("Error creating call:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    )
  }
}
