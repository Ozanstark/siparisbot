import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  texts: z.array(z.string()).min(1, "At least one text chunk is required"),
  enableAutoRefresh: z.boolean().optional().default(false),
})

// GET /api/knowledge-bases - List knowledge bases (tenant-scoped)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { bots: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ knowledgeBases })
  } catch (error) {
    console.error("Error fetching knowledge bases:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    )
  }
}

// POST /api/knowledge-bases - Create new knowledge base
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = createKnowledgeBaseSchema.parse(body)

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Create knowledge base in Retell (using raw API)
    const retellKB = await callRetellApi("POST", "/create-knowledge-base", {
      knowledge_base_name: data.name,
      texts: data.texts,
      enable_auto_refresh: data.enableAutoRefresh,
    }, organizationId) as any

    // Save to database
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        organizationId,
        retellKnowledgeBaseId: retellKB.knowledge_base_id,
        name: data.name,
        texts: data.texts,
        enableAutoRefresh: data.enableAutoRefresh,
      },
      include: {
        _count: {
          select: { bots: true }
        }
      }
    })

    return NextResponse.json({ knowledgeBase }, { status: 201 })
  } catch (error) {
    console.error("Error creating knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    )
  }
}
