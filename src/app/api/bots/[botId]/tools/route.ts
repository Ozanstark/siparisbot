import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient } from "@/lib/retell"
import { z } from "zod"

// Zod schema for tool definition validation
const toolParameterSchema = z.object({
  type: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
  description: z.string(),
  required: z.boolean().optional(),
  enum: z.array(z.string()).optional(),
  items: z.any().optional(),
  properties: z.record(z.any()).optional(),
})

const toolSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Function name must contain only letters, numbers, hyphens, and underscores"),
    description: z.string().min(1),
    parameters: z.object({
      type: z.literal("object"),
      properties: z.record(toolParameterSchema),
      required: z.array(z.string()).optional(),
    }),
    async: z.boolean().optional(),
    speak_during_execution: z.boolean().optional(),
    speak_after_execution: z.boolean().optional(),
    url: z.string().url().optional(), // For webhook-based tools
  }),
})

const updateToolsSchema = z.object({
  customTools: z.array(toolSchema).max(128, "Maximum 128 tools allowed"),
})

// GET /api/bots/[botId]/tools - Get bot's custom tools
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
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.botId,
        organizationId
      },
      select: {
        id: true,
        name: true,
        customTools: true
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    return NextResponse.json({
      botId: bot.id,
      botName: bot.name,
      customTools: bot.customTools || []
    })
  } catch (error) {
    console.error("Error fetching bot tools:", error)
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    )
  }
}

// PUT /api/bots/[botId]/tools - Update bot's custom tools
export async function PUT(
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
    const data = updateToolsSchema.parse(body)

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

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Update LLM with tools
    if (bot.retellLlmId) {
      await retellClient.llm.update(bot.retellLlmId, {
        tools: data.customTools as any
      })
    }

    // Update bot in database
    const updatedBot = await prisma.bot.update({
      where: { id: params.botId },
      data: {
        customTools: data.customTools as any
      },
      select: {
        id: true,
        name: true,
        customTools: true
      }
    })

    return NextResponse.json({
      botId: updatedBot.id,
      botName: updatedBot.name,
      customTools: updatedBot.customTools || []
    })
  } catch (error) {
    console.error("Error updating bot tools:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid tool definition", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update tools" },
      { status: 500 }
    )
  }
}
