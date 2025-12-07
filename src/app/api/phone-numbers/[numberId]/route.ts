import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updatePhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"

export const dynamic = "force-dynamic"

// GET /api/phone-numbers/[numberId] - Get phone number details
export async function GET(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { numberId } = params

  try {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignedToUserId: userId
        })
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
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

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    return NextResponse.json({ phoneNumber })
  } catch (error) {
    console.error("Error fetching phone number:", error)
    return NextResponse.json(
      { error: "Failed to fetch phone number" },
      { status: 500 }
    )
  }
}

// PUT /api/phone-numbers/[numberId] - Update phone number
export async function PUT(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user
  const { numberId } = params

  // Only admins can update phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    // Verify ownership
    const existingPhone = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!existingPhone) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updatePhoneNumberSchema.parse(body)

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

    // Update Retell phone number if agent binding changed
    if ((data.inboundAgentId !== undefined || data.outboundAgentId !== undefined) && existingPhone.retellPhoneNumberId) {
      const updateData: any = {}
      let shouldUpdate = false

      // Handle inbound agent
      if (data.inboundAgentId !== undefined) {
        if (data.inboundAgentId) {
          const bot = await prisma.bot.findFirst({
            where: { id: data.inboundAgentId, organizationId }
          })
          if (!bot) {
            return NextResponse.json({ error: "Inbound bot not found" }, { status: 404 })
          }
          updateData.inbound_agent_id = bot.retellAgentId
        } else {
          updateData.inbound_agent_id = null
        }
        shouldUpdate = true
      }

      // Handle outbound agent
      if (data.outboundAgentId !== undefined) {
        if (data.outboundAgentId) {
          const bot = await prisma.bot.findFirst({
            where: { id: data.outboundAgentId, organizationId }
          })
          if (!bot) {
            return NextResponse.json({ error: "Outbound bot not found" }, { status: 404 })
          }
          updateData.outbound_agent_id = bot.retellAgentId
        } else {
          updateData.outbound_agent_id = null
        }
        shouldUpdate = true
      }

      // Legacy support: if agentId provided, set both inbound and outbound
      if (data.agentId !== undefined) {
        if (data.agentId) {
          const bot = await prisma.bot.findFirst({
            where: { id: data.agentId, organizationId }
          })
          if (!bot) {
            return NextResponse.json({ error: "Bot not found" }, { status: 404 })
          }
          updateData.inbound_agent_id = bot.retellAgentId
          updateData.outbound_agent_id = bot.retellAgentId
        } else {
          updateData.inbound_agent_id = null
          updateData.outbound_agent_id = null
        }
        shouldUpdate = true
      }

      if (shouldUpdate) {
        const response = await fetch(`https://api.retellai.com/update-phone-number/${existingPhone.retellPhoneNumberId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to update Retell phone number: ${response.statusText} - ${JSON.stringify(errorData)}`)
        }
      }
    }

    // Update database
    const phoneNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: {
        ...(data.inboundAgentId !== undefined && { inboundAgentId: data.inboundAgentId }),
        ...(data.outboundAgentId !== undefined && { outboundAgentId: data.outboundAgentId }),
        // Legacy support
        ...(data.agentId !== undefined && {
          inboundAgentId: data.agentId,
          outboundAgentId: data.agentId
        }),
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ phoneNumber })
  } catch (error) {
    console.error("Error updating phone number:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    )
  }
}

// DELETE /api/phone-numbers/[numberId] - Delete phone number
export async function DELETE(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user
  const { numberId } = params

  // Only admins can delete phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
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

    // Delete from Retell if it has a Retell ID
    if (phoneNumber.retellPhoneNumberId) {
      try {
        const response = await fetch(`https://api.retellai.com/delete-phone-number/${phoneNumber.retellPhoneNumberId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          console.error("Error deleting from Retell:", await response.text())
          // Continue with database deletion even if Retell deletion fails
        }
      } catch (retellError) {
        console.error("Error deleting from Retell:", retellError)
        // Continue with database deletion even if Retell deletion fails
      }
    }

    // Delete from database
    await prisma.phoneNumber.delete({ where: { id: numberId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting phone number:", error)
    return NextResponse.json(
      { error: "Failed to delete phone number" },
      { status: 500 }
    )
  }
}
