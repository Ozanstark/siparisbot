import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { importPhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"

export const dynamic = "force-dynamic"

/**
 * POST /api/phone-numbers/import - Import an existing phone number to Retell
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user

  // Only admins can import phone numbers
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = importPhoneNumberSchema.parse(body)

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

    // Check if phone number already exists in database
    const existingPhone = await prisma.phoneNumber.findFirst({
      where: {
        number: data.phoneNumber,
        organizationId
      }
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already imported" },
        { status: 400 }
      )
    }

    // Import phone number to Retell
    const retellData: any = {
      phone_number: data.phoneNumber
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

    const response = await fetch("https://api.retellai.com/import-phone-number", {
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
        number: data.phoneNumber,
        organizationId,
        retellPhoneNumberId: retellPhone.phone_number || data.phoneNumber,
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
      message: "Phone number imported successfully"
    })
  } catch (error: any) {
    console.error("Error importing phone number:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to import phone number", details: error.message },
      { status: 500 }
    )
  }
}
