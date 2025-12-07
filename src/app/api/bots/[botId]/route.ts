import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateBotSchema } from "@/lib/validations"
import { z } from "zod"

export const dynamic = "force-dynamic"

// GET /api/bots/[botId] - Get bot details
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
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: { some: { userId } }
        })
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        calls: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            analytics: true
          }
        }
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    return NextResponse.json({ bot })
  } catch (error) {
    console.error("Error fetching bot:", error)
    return NextResponse.json(
      { error: "Failed to fetch bot" },
      { status: 500 }
    )
  }
}

// PUT /api/bots/[botId] - Update bot
export async function PUT(
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
    // Verify ownership
    const existingBot = await prisma.bot.findFirst({
      where: {
        id: botId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: { some: { userId } }
        })
      }
    })

    if (!existingBot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateBotSchema.parse(body)

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

    // Update Retell Agent if any agent-level settings changed
    const agentUpdatePayload: any = {}
    let shouldUpdateAgent = false

    if (data.voiceId && data.voiceId !== existingBot.voiceId) {
      agentUpdatePayload.voice_id = data.voiceId
      shouldUpdateAgent = true
    }
    if (data.name && data.name !== existingBot.name) {
      agentUpdatePayload.agent_name = data.name
      shouldUpdateAgent = true
    }
    if (data.language && data.language !== existingBot.language) {
      agentUpdatePayload.language = data.language
      shouldUpdateAgent = true
    }
    if (data.webhookUrl !== undefined && data.webhookUrl !== existingBot.webhookUrl) {
      agentUpdatePayload.webhook_url = data.webhookUrl
      shouldUpdateAgent = true
    }

    // Add advanced voice settings
    if (data.voiceTemperature !== undefined) {
      agentUpdatePayload.voice_temperature = data.voiceTemperature
      shouldUpdateAgent = true
    }
    if (data.voiceSpeed !== undefined) {
      agentUpdatePayload.voice_speed = data.voiceSpeed
      shouldUpdateAgent = true
    }
    if (data.responsiveness !== undefined) {
      agentUpdatePayload.responsiveness = data.responsiveness
      shouldUpdateAgent = true
    }
    if (data.interruptionSensitivity !== undefined) {
      agentUpdatePayload.interruption_sensitivity = data.interruptionSensitivity
      shouldUpdateAgent = true
    }
    if (data.enableBackchannel !== undefined) {
      agentUpdatePayload.enable_backchannel = data.enableBackchannel
      shouldUpdateAgent = true
    }
    if (data.ambientSound !== undefined) {
      agentUpdatePayload.ambient_sound = data.ambientSound
      shouldUpdateAgent = true
    }
    if (data.boostedKeywords !== undefined) {
      agentUpdatePayload.boosted_keywords = data.boostedKeywords
      shouldUpdateAgent = true
    }
    if (data.normalizeForSpeech !== undefined) {
      agentUpdatePayload.normalize_for_speech = data.normalizeForSpeech
      shouldUpdateAgent = true
    }
    if (data.optOutSensitiveDataStorage !== undefined) {
      agentUpdatePayload.opt_out_sensitive_data_storage = data.optOutSensitiveDataStorage
      shouldUpdateAgent = true
    }

    if (shouldUpdateAgent) {
      const agentResponse = await fetch(`https://api.retellai.com/update-agent/${existingBot.retellAgentId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${organization.retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(agentUpdatePayload)
      })

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json().catch(() => ({}))
        throw new Error(`Failed to update Retell agent: ${agentResponse.statusText} - ${JSON.stringify(errorData)}`)
      }
    }

    // Update Retell LLM if prompt or model changed
    if ((data.generalPrompt || data.beginMessage || data.model) && existingBot.retellLlmId) {
      const llmUpdateData: any = {}
      if (data.generalPrompt) llmUpdateData.general_prompt = data.generalPrompt
      if (data.beginMessage !== undefined) llmUpdateData.begin_message = data.beginMessage
      if (data.model) llmUpdateData.model = data.model

      const llmResponse = await fetch(`https://api.retellai.com/update-retell-llm/${existingBot.retellLlmId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${organization.retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(llmUpdateData)
      })

      if (!llmResponse.ok) {
        const errorData = await llmResponse.json().catch(() => ({}))
        throw new Error(`Failed to update Retell LLM: ${llmResponse.statusText} - ${JSON.stringify(errorData)}`)
      }
    }

    // Update database
    const bot = await prisma.bot.update({
      where: { id: botId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.voiceId && { voiceId: data.voiceId }),
        ...(data.model && { model: data.model }),
        ...(data.generalPrompt && { generalPrompt: data.generalPrompt }),
        ...(data.beginMessage !== undefined && { beginMessage: data.beginMessage }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.language && { language: data.language }),
        ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
        // Advanced voice settings
        ...(data.voiceTemperature !== undefined && { voiceTemperature: data.voiceTemperature }),
        ...(data.voiceSpeed !== undefined && { voiceSpeed: data.voiceSpeed }),
        ...(data.responsiveness !== undefined && { responsiveness: data.responsiveness }),
        ...(data.interruptionSensitivity !== undefined && { interruptionSensitivity: data.interruptionSensitivity }),
        ...(data.enableBackchannel !== undefined && { enableBackchannel: data.enableBackchannel }),
        ...(data.ambientSound !== undefined && { ambientSound: data.ambientSound }),
        ...(data.boostedKeywords !== undefined && { boostedKeywords: data.boostedKeywords }),
        ...(data.normalizeForSpeech !== undefined && { normalizeForSpeech: data.normalizeForSpeech }),
        ...(data.optOutSensitiveDataStorage !== undefined && { optOutSensitiveDataStorage: data.optOutSensitiveDataStorage }),
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    return NextResponse.json({ bot })
  } catch (error) {
    console.error("Error updating bot:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update bot" },
      { status: 500 }
    )
  }
}

// DELETE /api/bots/[botId] - Delete bot
export async function DELETE(
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

    // Get organization API key
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { retellApiKey: true }
    })

    // Delete from Retell using raw API
    if (organization?.retellApiKey) {
      try {
        const agentResponse = await fetch(`https://api.retellai.com/delete-agent/${bot.retellAgentId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (!agentResponse.ok) {
          console.error("Error deleting agent from Retell:", await agentResponse.text())
        }

        if (bot.retellLlmId) {
          const llmResponse = await fetch(`https://api.retellai.com/delete-retell-llm/${bot.retellLlmId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${organization.retellApiKey}`,
              "Content-Type": "application/json"
            }
          })

          if (!llmResponse.ok) {
            console.error("Error deleting LLM from Retell:", await llmResponse.text())
          }
        }
      } catch (retellError) {
        console.error("Error deleting from Retell:", retellError)
        // Continue with database deletion even if Retell deletion fails
      }
    }

    // Delete from database (cascade handles assignments, calls)
    await prisma.bot.delete({ where: { id: botId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bot:", error)
    return NextResponse.json(
      { error: "Failed to delete bot" },
      { status: 500 }
    )
  }
}
