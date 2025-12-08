import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/debug/webhook-logs - Get recent webhook logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const logs = await prisma.webhookLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        eventType: true,
        processed: true,
        error: true,
        payload: true,
        createdAt: true,
        callId: true
      }
    })

    return NextResponse.json({
      success: true,
      logs
    })
  } catch (error: any) {
    console.error("Error fetching webhook logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhook logs", details: error.message },
      { status: 500 }
    )
  }
}
