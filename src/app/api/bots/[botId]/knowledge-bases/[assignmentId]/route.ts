import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient } from "@/lib/retell"

// DELETE /api/bots/[botId]/knowledge-bases/[assignmentId] - Unassign KB from bot
export async function DELETE(
  req: NextRequest,
  { params }: { params: { botId: string; assignmentId: string } }
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

    // Verify assignment exists
    const assignment = await prisma.botKnowledgeBase.findFirst({
      where: {
        id: params.assignmentId,
        botId: params.botId
      },
      include: {
        knowledgeBase: true
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Get remaining assignments after deletion
    const remainingAssignments = await prisma.botKnowledgeBase.findMany({
      where: {
        botId: params.botId,
        id: { not: params.assignmentId }
      },
      include: { knowledgeBase: true }
    })

    const knowledgeBaseIds = remainingAssignments.map(a => ({
      knowledge_base_id: a.knowledgeBase.retellKnowledgeBaseId,
      top_k: a.topK,
      filter_score: a.filterScore,
    }))

    // Update agent in Retell
    await retellClient.agent.update(bot.retellAgentId, {
      knowledge_base_ids: knowledgeBaseIds.length > 0 ? knowledgeBaseIds : []
    })

    // Delete assignment from database
    await prisma.botKnowledgeBase.delete({
      where: { id: params.assignmentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unassigning knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to unassign knowledge base" },
      { status: 500 }
    )
  }
}
