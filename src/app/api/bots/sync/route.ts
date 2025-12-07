import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/bots/sync - Sync bots from Retell to database
 * This endpoint fetches all agents from Retell API and creates them in the database
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  // Only admins can sync bots
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    // Get organization API key
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { retellApiKey: true }
    })

    if (!organization?.retellApiKey) {
      throw new Error("Retell API key not configured. Please add it in admin settings.")
    }

    // Fetch all agents from Retell using direct API call to bypass SDK validation
    const response = await fetch("https://api.retellai.com/list-agents", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const retellAgents = await response.json()

    console.log(`Found ${retellAgents.length} agents in Retell`)
    console.log("First agent structure:", JSON.stringify(retellAgents[0], null, 2))

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const agent of retellAgents) {
      try {
        // Check if bot already exists in database
        const existingBot = await prisma.bot.findFirst({
          where: {
            retellAgentId: agent.agent_id,
            organizationId
          }
        })

        // Extract LLM details if available
        let llmId = null
        let model = "gpt-4.1"
        let generalPrompt = "You are a helpful AI assistant."
        let beginMessage = "Hello! How can I help you today?"

        if (agent.response_engine?.type === "retell-llm" && agent.response_engine?.llm_id) {
          llmId = agent.response_engine.llm_id

          // Fetch LLM details from Retell API
          try {
            const llmResponse = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${organization.retellApiKey}`,
                "Content-Type": "application/json"
              }
            })

            if (llmResponse.ok) {
              const llmData = await llmResponse.json()
              model = llmData.model || model
              generalPrompt = llmData.general_prompt || generalPrompt
              beginMessage = llmData.begin_message || beginMessage
            }
          } catch (llmError) {
            console.warn(`Could not fetch LLM details for ${llmId}:`, llmError)
          }
        }

        if (existingBot) {
          // Update existing bot with latest info
          await prisma.bot.update({
            where: { id: existingBot.id },
            data: {
              name: agent.agent_name || existingBot.name,
              voiceId: agent.voice_id || existingBot.voiceId,
              webhookUrl: agent.webhook_url || existingBot.webhookUrl,
              model,
              generalPrompt,
              beginMessage,
              isActive: true,
              updatedAt: new Date()
            }
          })
          results.updated++
          console.log(`Updated bot: ${agent.agent_name} (${agent.agent_id})`)
        } else {
          // Create new bot in database
          await prisma.bot.create({
            data: {
              name: agent.agent_name || `Imported Bot ${agent.agent_id.slice(0, 8)}`,
              description: "Imported from Retell AI",
              organizationId,
              createdById: userId,
              retellAgentId: agent.agent_id,
              retellLlmId: llmId,
              voiceId: agent.voice_id || "11labs-Adrian",
              model,
              generalPrompt,
              beginMessage,
              webhookUrl: agent.webhook_url || null,
              isActive: true
            }
          })
          results.created++
          console.log(`Created bot: ${agent.agent_name} (${agent.agent_id})`)
        }
      } catch (botError: any) {
        console.error(`Error processing bot ${agent.agent_id}:`, botError)
        results.errors.push(`${agent.agent_name || agent.agent_id}: ${botError.message}`)
        results.skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results
    })
  } catch (error: any) {
    console.error("Error syncing bots from Retell:", error)
    return NextResponse.json(
      {
        error: "Failed to sync bots from Retell",
        details: error.message
      },
      { status: 500 }
    )
  }
}
