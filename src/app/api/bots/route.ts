import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient } from "@/lib/retell"
import { createBotSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/bots - List bots (tenant-scoped)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    // Admins see all bots in org, customers see assigned bots
    const bots = await prisma.bot.findMany({
      where: {
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: {
            some: { userId }
          }
        })
      },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { calls: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ bots })
  } catch (error) {
    console.error("Error fetching bots:", error)
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 }
    )
  }
}

// POST /api/bots - Create new bot
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const data = createBotSchema.parse(body)

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Step 1: Create LLM in Retell
    const llm = await retellClient.llm.create({
      model: data.model,
      general_prompt: data.generalPrompt,
      begin_message: data.beginMessage || "Hello! How can I help you today?"
    })

    // Step 2: Create Agent in Retell with advanced settings
    const webhookUrl = data.webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`

    const agentPayload: any = {
      response_engine: {
        llm_id: llm.llm_id,
        type: "retell-llm"
      },
      voice_id: data.voiceId,
      agent_name: data.name,
      webhook_url: webhookUrl,
      language: data.language || "en-US"
    }

    // Add advanced voice settings if provided
    if (data.voiceTemperature !== undefined) agentPayload.voice_temperature = data.voiceTemperature
    if (data.voiceSpeed !== undefined) agentPayload.voice_speed = data.voiceSpeed
    if (data.responsiveness !== undefined) agentPayload.responsiveness = data.responsiveness
    if (data.interruptionSensitivity !== undefined) agentPayload.interruption_sensitivity = data.interruptionSensitivity
    if (data.enableBackchannel !== undefined) agentPayload.enable_backchannel = data.enableBackchannel
    if (data.ambientSound) agentPayload.ambient_sound = data.ambientSound
    if (data.boostedKeywords && data.boostedKeywords.length > 0) agentPayload.boosted_keywords = data.boostedKeywords
    if (data.normalizeForSpeech !== undefined) agentPayload.normalize_for_speech = data.normalizeForSpeech
    if (data.optOutSensitiveDataStorage !== undefined) agentPayload.opt_out_sensitive_data_storage = data.optOutSensitiveDataStorage

    const agent = await retellClient.agent.create(agentPayload)

    // Step 3: Create bot in database
    const bot = await prisma.bot.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        createdById: userId,
        retellAgentId: agent.agent_id,
        retellLlmId: llm.llm_id,
        voiceId: data.voiceId,
        model: data.model,
        generalPrompt: data.generalPrompt,
        beginMessage: data.beginMessage || "Hello! How can I help you today?",
        webhookUrl,
        language: data.language || "en-US",
        // Advanced voice settings
        voiceTemperature: data.voiceTemperature,
        voiceSpeed: data.voiceSpeed,
        responsiveness: data.responsiveness,
        interruptionSensitivity: data.interruptionSensitivity,
        enableBackchannel: data.enableBackchannel || false,
        ambientSound: data.ambientSound,
        boostedKeywords: data.boostedKeywords || [],
        normalizeForSpeech: data.normalizeForSpeech ?? true,
        optOutSensitiveDataStorage: data.optOutSensitiveDataStorage || false,
        // Auto-assign to creator if customer
        ...(role === "CUSTOMER" && {
          assignments: {
            create: { userId }
          }
        })
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    return NextResponse.json({ bot }, { status: 201 })
  } catch (error) {
    console.error("Error creating bot:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create bot" },
      { status: 500 }
    )
  }
}
