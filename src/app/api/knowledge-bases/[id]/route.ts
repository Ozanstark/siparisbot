import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { z } from "zod"

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  texts: z.array(z.string()).min(1).optional(),
  enableAutoRefresh: z.boolean().optional(),
})

// GET /api/knowledge-bases/[id] - Get single knowledge base
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        bots: {
          include: {
            bot: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ knowledgeBase })
  } catch (error) {
    console.error("Error fetching knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    )
  }
}

// PUT /api/knowledge-bases/[id] - Update knowledge base
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = updateKnowledgeBaseSchema.parse(body)

    // Verify ownership
    const existingKB = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingKB) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Update KB in Retell (using raw API)
    await callRetellApi(
      "PATCH",
      `/knowledge-base/${existingKB.retellKnowledgeBaseId}`, // Try RESTful path first
      {
        ...(data.name && { knowledge_base_name: data.name }),
        ...(data.texts && { texts: data.texts }),
        ...(data.enableAutoRefresh !== undefined && { enable_auto_refresh: data.enableAutoRefresh }),
      },
      organizationId
    )

    // Update in database
    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.texts && { texts: data.texts }),
        ...(data.enableAutoRefresh !== undefined && { enableAutoRefresh: data.enableAutoRefresh }),
      },
      include: {
        bots: {
          include: {
            bot: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ knowledgeBase })
  } catch (error) {
    console.error("Error updating knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update knowledge base" },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge-bases/[id] - Delete knowledge base
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // Verify ownership
    const existingKB = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingKB) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Delete KB from Retell (using raw API)
    await callRetellApi(
      "DELETE",
      `/knowledge-base/${existingKB.retellKnowledgeBaseId}`,
      null,
      organizationId
    )

    // Delete from database (cascade will remove BotKnowledgeBase entries)
    await prisma.knowledgeBase.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to delete knowledge base" },
      { status: 500 }
    )
  }
}
