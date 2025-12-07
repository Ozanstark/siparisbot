import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/calls/active - List active/in-progress calls
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    // Fetch calls that are currently active (INITIATED or IN_PROGRESS)
    const activeCalls = await prisma.call.findMany({
      where: {
        organizationId,
        status: {
          in: ["INITIATED", "IN_PROGRESS"]
        },
        ...(role === "CUSTOMER" && {
          bot: {
            assignments: { some: { userId } }
          }
        })
      },
      include: {
        bot: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    // Calculate duration for active calls
    const callsWithDuration = activeCalls.map(call => {
      const duration = call.startedAt
        ? Math.floor((new Date().getTime() - new Date(call.startedAt).getTime()) / 1000)
        : null

      return {
        ...call,
        currentDuration: duration
      }
    })

    return NextResponse.json({
      activeCalls: callsWithDuration,
      count: callsWithDuration.length
    })
  } catch (error) {
    console.error("Error fetching active calls:", error)
    return NextResponse.json(
      { error: "Failed to fetch active calls" },
      { status: 500 }
    )
  }
}
