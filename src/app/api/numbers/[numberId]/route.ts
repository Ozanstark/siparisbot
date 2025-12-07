import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updatePhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/numbers/[numberId] - Get number details
export async function GET(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user
  const { numberId } = params

  try {
    const number = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!number) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
    }

    return NextResponse.json({ number })
  } catch (error) {
    console.error("Error fetching number:", error)
    return NextResponse.json(
      { error: "Failed to fetch number" },
      { status: 500 }
    )
  }
}

// PUT /api/numbers/[numberId] - Update number (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { numberId } = params

  try {
    const body = await req.json()
    const data = updatePhoneNumberSchema.parse(body)

    const number = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!number) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
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

    // If agentId is being updated and number is from Retell, update binding
    if (data.agentId !== undefined && number.retellPhoneNumberId) {
      let retellAgentId: string | null = null

      if (data.agentId) {
        const bot = await prisma.bot.findFirst({
          where: { id: data.agentId, organizationId },
          select: { retellAgentId: true }
        })
        if (!bot) {
          return NextResponse.json({ error: "Bot not found" }, { status: 404 })
        }
        retellAgentId = bot.retellAgentId
      }

      // Update agent binding in Retell using raw API
      try {
        const response = await fetch(`https://api.retellai.com/update-phone-number/${number.retellPhoneNumberId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inbound_agent_id: retellAgentId,
            outbound_agent_id: retellAgentId
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
        }
      } catch (retellError) {
        console.error("Error updating Retell phone number:", retellError)
        return NextResponse.json(
          { error: "Failed to update agent binding in Retell" },
          { status: 500 }
        )
      }
    }

    // Update in database (using new field names)
    const updatedNumber = await prisma.phoneNumber.update({
      where: { id: numberId },
      data: {
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.agentId !== undefined && {
          inboundAgentId: data.agentId,
          outboundAgentId: data.agentId
        })
      },
      include: {
        inboundAgent: { select: { id: true, name: true } },
        outboundAgent: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({ number: updatedNumber })
  } catch (error) {
    console.error("Error updating number:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update number" },
      { status: 500 }
    )
  }
}

// DELETE /api/numbers/[numberId] - Delete number (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { numberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { numberId } = params

  try {
    const number = await prisma.phoneNumber.findFirst({
      where: {
        id: numberId,
        organizationId
      }
    })

    if (!number) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
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

    // If number is from Retell, delete from Retell first
    if (number.retellPhoneNumberId) {
      try {
        const response = await fetch(`https://api.retellai.com/delete-phone-number/${number.retellPhoneNumberId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          console.error("Error deleting from Retell:", await response.text())
          // Continue to delete from database even if Retell delete fails
        }
      } catch (retellError) {
        console.error("Error deleting from Retell:", retellError)
        // Continue to delete from database even if Retell delete fails
        // (number might already be deleted from Retell)
      }
    }

    // Delete from database
    await prisma.phoneNumber.delete({ where: { id: numberId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting number:", error)
    return NextResponse.json(
      { error: "Failed to delete number" },
      { status: 500 }
    )
  }
}
