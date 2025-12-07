import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/bots/[botId]/versions/[versionId]/publish - Publish a version
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string; versionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, id: userId } = session.user
  const { botId, versionId } = params

  try {
    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: { id: botId, organizationId },
      include: { versions: true }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Get version to publish
    const version = await prisma.botVersion.findFirst({
      where: { id: versionId, botId }
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    if (version.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only publish draft versions" },
        { status: 400 }
      )
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

    // Update Retell agent with new configuration using raw API
    const agentResponse = await fetch(`https://api.retellai.com/update-agent/${bot.retellAgentId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_name: version.name,
        voice_id: version.voiceId
      })
    })

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({}))
      throw new Error(`Retell API error: ${agentResponse.statusText} - ${JSON.stringify(errorData)}`)
    }

    // Update LLM config
    if (bot.retellLlmId) {
      const llmResponse = await fetch(`https://api.retellai.com/update-retell-llm/${bot.retellLlmId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${organization.retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          general_prompt: version.generalPrompt,
          begin_message: version.beginMessage || undefined,
          model: version.model
        })
      })

      if (!llmResponse.ok) {
        const errorData = await llmResponse.json().catch(() => ({}))
        throw new Error(`Retell LLM API error: ${llmResponse.statusText} - ${JSON.stringify(errorData)}`)
      }
    }

    // Transaction: Archive old published version, publish new one, update bot
    const result = await prisma.$transaction(async (tx) => {
      // Archive current published version if exists
      const currentPublished = bot.versions.find(v => v.status === "PUBLISHED")
      if (currentPublished) {
        await tx.botVersion.update({
          where: { id: currentPublished.id },
          data: { status: "ARCHIVED" }
        })
      }

      // Publish new version
      const publishedVersion = await tx.botVersion.update({
        where: { id: versionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: userId
        }
      })

      // Update bot with new configuration
      const updatedBot = await tx.bot.update({
        where: { id: botId },
        data: {
          name: version.name,
          description: version.description,
          voiceId: version.voiceId,
          model: version.model,
          generalPrompt: version.generalPrompt,
          beginMessage: version.beginMessage,
          publishedVersionId: versionId
        }
      })

      return { version: publishedVersion, bot: updatedBot }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error publishing version:", error)
    return NextResponse.json(
      { error: "Failed to publish version", details: (error as Error).message },
      { status: 500 }
    )
  }
}
