import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/debug/retell-calls - Debug: Test Retell API and fetch calls
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // 1. Get organization and API key
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        retellApiKey: true,
        retellWebhookSecret: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const hasApiKey = !!organization.retellApiKey
    const hasWebhookSecret = !!organization.retellWebhookSecret

    // 2. Get calls from database
    const dbCalls = await prisma.call.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        bot: { select: { id: true, name: true, retellAgentId: true } },
        initiatedBy: { select: { id: true, name: true, email: true } }
      }
    })

    // 3. Get webhook logs
    const webhookLogs = await prisma.webhookLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10
    })

    // 4. Get bots
    const bots = await prisma.bot.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        retellAgentId: true,
        webhookUrl: true,
        isActive: true,
        inboundPhones: {
          select: {
            id: true,
            number: true,
            nickname: true,
            isActive: true
          }
        }
      }
    })

    // 5. Get phone numbers
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { organizationId },
      select: {
        id: true,
        number: true,
        nickname: true,
        isActive: true,
        assignedBotId: true,
        assignedBot: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    let retellCalls = null
    let retellError = null
    let retellPhoneNumbers = null
    let retellPhoneError = null

    // 6. Try to fetch calls from Retell API
    if (hasApiKey) {
      try {
        const response = await fetch("https://api.retellai.com/v2/list-calls", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (response.ok) {
          const data = await response.json()
          retellCalls = data.calls || data
        } else {
          retellError = `Retell API Error: ${response.status} ${response.statusText}`
          const errorData = await response.text()
          retellError += ` - ${errorData}`
        }
      } catch (error: any) {
        retellError = `Retell API Request Failed: ${error.message}`
      }

      // 7. Try to fetch phone numbers from Retell
      try {
        const phoneResponse = await fetch("https://api.retellai.com/v2/list-phone-numbers", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json()
          retellPhoneNumbers = phoneData.phone_numbers || phoneData
        } else {
          retellPhoneError = `${phoneResponse.status} ${phoneResponse.statusText}`
        }
      } catch (error: any) {
        retellPhoneError = error.message
      }
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        hasApiKey,
        hasWebhookSecret
      },
      database: {
        callsCount: dbCalls.length,
        calls: dbCalls,
        webhookLogsCount: webhookLogs.length,
        webhookLogs: webhookLogs.slice(0, 5)
      },
      bots: {
        count: bots.length,
        list: bots,
        withWebhook: bots.filter(b => b.webhookUrl).length,
        withPhoneNumber: bots.filter(b => b.inboundPhones && b.inboundPhones.length > 0).length
      },
      phoneNumbers: {
        count: phoneNumbers.length,
        list: phoneNumbers,
        assigned: phoneNumbers.filter(p => p.assignedBotId).length,
        active: phoneNumbers.filter(p => p.isActive).length
      },
      retell: {
        hasApiKey,
        apiWorking: !!retellCalls,
        callsCount: retellCalls ? (Array.isArray(retellCalls) ? retellCalls.length : 0) : 0,
        calls: retellCalls ? (Array.isArray(retellCalls) ? retellCalls.slice(0, 5) : []) : null,
        error: retellError,
        phoneNumbers: retellPhoneNumbers,
        phoneError: retellPhoneError
      }
    })
  } catch (error: any) {
    console.error("Debug error:", error)
    return NextResponse.json(
      { error: "Failed to fetch debug info", details: error.message },
      { status: 500 }
    )
  }
}
