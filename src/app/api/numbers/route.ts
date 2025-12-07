import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { purchasePhoneNumberSchema, importPhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/numbers - List phone numbers (with Retell sync)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { searchParams } = new URL(req.url)
  const sync = searchParams.get("sync") === "true" // Optional sync parameter

  try {
    // If admin requests sync, fetch from Retell and update database
    if (sync && role === "ADMIN") {
      try {
        // Get organization API key
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { retellApiKey: true }
        })

        if (!organization?.retellApiKey) {
          throw new Error("Retell API key not configured")
        }

        // Use raw API call instead of SDK
        const response = await fetch("https://api.retellai.com/list-phone-numbers", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          throw new Error(`Retell API error: ${response.statusText}`)
        }

        const retellNumbers = await response.json()

        // Sync Retell numbers with database
        for (const retellNumber of retellNumbers) {
          await prisma.phoneNumber.upsert({
            where: {
              retellPhoneNumberId: retellNumber.phone_number
            },
            create: {
              number: retellNumber.phone_number,
              retellPhoneNumberId: retellNumber.phone_number,
              organizationId,
              inboundAgentId: retellNumber.inbound_agent_id || null,
              outboundAgentId: retellNumber.outbound_agent_id || null,
              isActive: true
            },
            update: {
              number: retellNumber.phone_number,
              inboundAgentId: retellNumber.inbound_agent_id || null,
              outboundAgentId: retellNumber.outbound_agent_id || null
            }
          })
        }
      } catch (syncError) {
        console.error("Error syncing with Retell:", syncError)
        // Continue to return database numbers even if sync fails
      }
    }

    // Fetch from database
    const numbers = await prisma.phoneNumber.findMany({
      where: {
        organizationId,
        ...(role === "CUSTOMER" && {
          assignedToUserId: userId
        })
      },
      include: {
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ numbers })
  } catch (error) {
    console.error("Error fetching numbers:", error)
    return NextResponse.json(
      { error: "Failed to fetch numbers" },
      { status: 500 }
    )
  }
}

// POST /api/numbers - Purchase or Import phone number (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || "purchase" // "purchase" or "import"

  try {
    const body = await req.json()

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

    if (action === "purchase") {
      // Purchase phone number from Retell
      const data = purchasePhoneNumberSchema.parse(body)

      // Get bot's retellAgentId if agentId provided
      let retellAgentId: string | undefined
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

      // Purchase from Retell using raw API
      const purchaseResponse = await fetch("https://api.retellai.com/create-phone-number", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${organization.retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...(data.areaCode && { area_code: parseInt(data.areaCode) }),
          ...(retellAgentId && { agent_id: retellAgentId })
        })
      })

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json().catch(() => ({}))
        throw new Error(`Retell API error: ${purchaseResponse.statusText} - ${JSON.stringify(errorData)}`)
      }

      const retellNumber = await purchaseResponse.json()

      // Save to database
      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          number: retellNumber.phone_number,
          retellPhoneNumberId: retellNumber.phone_number_id,
          nickname: data.nickname,
          organizationId,
          inboundAgentId: data.agentId || null,
          outboundAgentId: data.agentId || null,
          isActive: true
        },
        include: {
          inboundAgent: { select: { id: true, name: true } },
          outboundAgent: { select: { id: true, name: true } }
        }
      })

      return NextResponse.json({ phoneNumber, source: "purchased" }, { status: 201 })
    } else if (action === "import") {
      // Import existing phone number to Retell
      const data = importPhoneNumberSchema.parse(body)

      // Get bot's retellAgentId if agentId provided
      let retellAgentId: string | undefined
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

      // Import to Retell using raw API
      const importResponse = await fetch("https://api.retellai.com/import-phone-number", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${organization.retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone_number: data.phoneNumber,
          ...(retellAgentId && { agent_id: retellAgentId })
        })
      })

      if (!importResponse.ok) {
        const errorData = await importResponse.json().catch(() => ({}))
        throw new Error(`Retell API error: ${importResponse.statusText} - ${JSON.stringify(errorData)}`)
      }

      const retellNumber = await importResponse.json()

      // Save to database
      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          number: retellNumber.phone_number,
          retellPhoneNumberId: retellNumber.phone_number_id,
          nickname: data.nickname,
          organizationId,
          inboundAgentId: data.agentId || null,
          outboundAgentId: data.agentId || null,
          isActive: true
        },
        include: {
          inboundAgent: { select: { id: true, name: true } },
          outboundAgent: { select: { id: true, name: true } }
        }
      })

      return NextResponse.json({ phoneNumber, source: "imported" }, { status: 201 })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error creating phone number:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create phone number", details: (error as Error).message },
      { status: 500 }
    )
  }
}
