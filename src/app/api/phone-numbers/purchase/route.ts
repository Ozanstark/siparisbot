import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { purchasePhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"

/**
 * POST /api/phone-numbers/purchase - Purchase a new phone number from Retell
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user

  // Only admins can purchase phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = purchasePhoneNumberSchema.parse(body)

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

    // Build request payload
    const retellData: any = {}

    // Add area code if provided
    if (data.areaCode) {
      retellData.area_code = parseInt(data.areaCode)
    }

    // If agentId provided, bind to agent
    if (data.agentId) {
      const bot = await prisma.bot.findFirst({
        where: {
          id: data.agentId,
          organizationId
        }
      })

      if (!bot) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        )
      }

      retellData.inbound_agent_id = bot.retellAgentId
      retellData.outbound_agent_id = bot.retellAgentId
    }

    // Purchase phone number from Retell
    const response = await fetch("https://api.retellai.com/create-phone-number", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(retellData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const retellPhone = await response.json()

    // Save to database
    const phoneNumber = await prisma.phoneNumber.create({
      data: {
        number: retellPhone.phone_number,
        organizationId,
        retellPhoneNumberId: retellPhone.phone_number,
        nickname: data.nickname || null,
        inboundAgentId: data.agentId || null,
        outboundAgentId: data.agentId || null,
        isActive: true
      },
      include: {
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      phoneNumber,
      message: `Phone number purchased successfully${data.areaCode ? ` with area code ${data.areaCode}` : ""}`
    })
  } catch (error: any) {
    console.error("Error purchasing phone number:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to purchase phone number", details: error.message },
      { status: 500 }
    )
  }
}
