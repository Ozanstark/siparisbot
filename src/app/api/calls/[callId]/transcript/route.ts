import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/calls/[callId]/transcript - Get formatted transcript
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
      select: {
        id: true,
        transcript: true,
        bot: { select: { name: true } }
      }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    if (!call.transcript) {
      return NextResponse.json(
        { error: "Transcript not available yet" },
        { status: 404 }
      )
    }

    // Try to parse transcript
    let transcript: any
    try {
      transcript = JSON.parse(call.transcript)
    } catch {
      transcript = call.transcript
    }

    return NextResponse.json({ transcript, botName: call.bot.name })
  } catch (error) {
    console.error("Error fetching transcript:", error)
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    )
  }
}
