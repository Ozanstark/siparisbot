import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { z } from "zod"

const assignKBSchema = z.object({
  knowledgeBaseId: z.string().cuid(),
  topK: z.number().int().min(1).max(20).optional().default(3),
  filterScore: z.number().min(0).max(1).optional().default(0.5),
})

// GET /api/bots/[botId]/knowledge-bases - List assigned knowledge bases
export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.botId,
        organizationId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    const assignments = await prisma.botKnowledgeBase.findMany({
      where: { botId: params.botId },
      include: {
        knowledgeBase: true
      }
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Error fetching bot knowledge bases:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    )
  }
}

// POST /api/bots/[botId]/knowledge-bases - Assign knowledge base to bot
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = assignKBSchema.parse(body)

    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.botId,
        organizationId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Verify KB ownership
    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: data.knowledgeBaseId,
        organizationId
      }
    })

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    // Check if already assigned
    const existing = await prisma.botKnowledgeBase.findUnique({
      where: {
        botId_knowledgeBaseId: {
          botId: params.botId,
          knowledgeBaseId: data.knowledgeBaseId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Knowledge base already assigned to this bot" },
        { status: 400 }
      )
    }

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Update agent in Retell to include KB
    const currentAssignments = await prisma.botKnowledgeBase.findMany({
      where: { botId: params.botId },
      include: { knowledgeBase: true }
    })

    const knowledgeBaseIds = [
      ...currentAssignments.map(a => ({
        knowledge_base_id: a.knowledgeBase.retellKnowledgeBaseId,
        top_k: a.topK,
        filter_score: a.filterScore,
      })),
      {
        knowledge_base_id: kb.retellKnowledgeBaseId,
        top_k: data.topK,
        filter_score: data.filterScore,
      }
    ]

    // Verify we have an LLM ID
    if (!bot.retellLlmId) {
      throw new Error("Bot does not have an associated LLM ID")
    }

    // Update LLM in Retell to include KB (using raw API)
    await callRetellApi(
      "PATCH",
      `/update-retell-llm/${bot.retellLlmId}`,
      { knowledge_base_ids: knowledgeBaseIds },
      organizationId
    )

    // Create assignment in database
    const assignment = await prisma.botKnowledgeBase.create({
      data: {
        botId: params.botId,
        knowledgeBaseId: data.knowledgeBaseId,
        topK: data.topK,
        filterScore: data.filterScore,
      },
      include: {
        knowledgeBase: true
      }
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Error assigning knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to assign knowledge base" },
      { status: 500 }
    )
  }
}
