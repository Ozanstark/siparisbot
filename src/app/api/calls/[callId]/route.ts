import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/calls/[callId] - Get call details
export async function GET(
  req: NextRequest,
  { params }: { params: { callId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user
  const { callId } = params

  try {
    const call = await prisma.call.findFirst({
      where: {
        id: callId,
        organizationId,
        ...(role === "CUSTOMER" && {
          bot: {
            assignments: { some: { userId } }
          }
        })
      },
      include: {
        bot: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true, email: true } },
        analytics: true,
        webhookLogs: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Optionally fetch latest data from Retell if call is recent
    if (call.status !== "ANALYZED" && call.createdAt > new Date(Date.now() - 3600000)) {
      try {
        // Get organization API key
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { retellApiKey: true }
        })

        if (organization?.retellApiKey) {
          const response = await fetch(`https://api.retellai.com/get-call/${call.retellCallId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${organization.retellApiKey}`,
              "Content-Type": "application/json"
            }
          })

          if (response.ok) {
            const retellCall = await response.json()

            // Update database with latest info
            const updatedCall = await prisma.call.update({
              where: { id: callId },
              data: {
                status: retellCall.end_timestamp ? "ENDED" : call.status,
                durationMs: retellCall.end_timestamp && retellCall.start_timestamp
                  ? retellCall.end_timestamp - retellCall.start_timestamp
                  : call.durationMs,
                transcript: retellCall.transcript
                  ? typeof retellCall.transcript === "string"
                    ? retellCall.transcript
                    : JSON.stringify(retellCall.transcript)
                  : call.transcript,
                recordingUrl: retellCall.recording_url || call.recordingUrl,
                startedAt: retellCall.start_timestamp
                  ? new Date(retellCall.start_timestamp)
                  : call.startedAt,
                endedAt: retellCall.end_timestamp
                  ? new Date(retellCall.end_timestamp)
                  : call.endedAt
              }
            })

            return NextResponse.json({ call: { ...call, ...updatedCall } })
          }
        }
      } catch (retellError) {
        console.error("Error fetching from Retell:", retellError)
      }
    }

    return NextResponse.json({ call })
  } catch (error) {
    console.error("Error fetching call:", error)
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    )
  }
}
