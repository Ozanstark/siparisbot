import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/calls/batch - Create multiple calls from CSV data
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const { botId, calls } = body

    if (!Array.isArray(calls) || calls.length === 0) {
      return NextResponse.json(
        { error: "Calls array is required and cannot be empty" },
        { status: 400 }
      )
    }

    // Verify bot access
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: { some: { userId } }
        })
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
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

    // Process calls with results tracking
    const results = []
    const errors = []

    for (let i = 0; i < calls.length; i++) {
      const callData = calls[i]

      try {
        // Validate phone number format (E.164)
        if (!callData.toNumber || !/^\+[1-9]\d{1,14}$/.test(callData.toNumber)) {
          errors.push({
            index: i,
            toNumber: callData.toNumber,
            error: "Invalid phone number format (E.164 required)"
          })
          continue
        }

        // Create call via Retell using raw API
        const response = await fetch("https://api.retellai.com/create-phone-call", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from_number: callData.fromNumber,
            to_number: callData.toNumber,
            override_agent_id: bot.retellAgentId,
            metadata: {
              organizationId,
              userId,
              botId,
              batchId: `batch_${Date.now()}`,
              ...callData.metadata
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
        }

        const retellCall = await response.json()

        // Save to database
        const call = await prisma.call.create({
          data: {
            organizationId,
            botId,
            initiatedById: userId,
            retellCallId: retellCall.call_id,
            fromNumber: callData.fromNumber,
            toNumber: callData.toNumber,
            status: "INITIATED"
          }
        })

        results.push({
          index: i,
          toNumber: callData.toNumber,
          callId: call.id,
          retellCallId: retellCall.call_id,
          success: true
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error creating call ${i}:`, error)
        errors.push({
          index: i,
          toNumber: callData.toNumber,
          error: (error as Error).message
        })
      }
    }

    return NextResponse.json({
      success: true,
      total: calls.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    })
  } catch (error) {
    console.error("Error processing batch calls:", error)
    return NextResponse.json(
      { error: "Failed to process batch calls", details: (error as Error).message },
      { status: 500 }
    )
  }
}
