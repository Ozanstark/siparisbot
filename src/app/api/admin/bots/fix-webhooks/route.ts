import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/admin/bots/fix-webhooks - Fix all bots webhook URLs
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { organizationId } = session.user

  try {
    // Get deployment URL from environment or request
    const deploymentUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL

    if (!deploymentUrl) {
      return NextResponse.json(
        { error: "Deployment URL not configured. Set NEXT_PUBLIC_APP_URL environment variable." },
        { status: 400 }
      )
    }

    const webhookUrl = `${deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`}/api/webhooks/retell`

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

    // Get all bots
    const bots = await prisma.bot.findMany({
      where: { organizationId }
    })

    const results = []

    // Update each bot
    for (const bot of bots) {
      try {
        // Update in Retell
        const retellResponse = await fetch(`https://api.retellai.com/update-agent/${bot.retellAgentId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${organization.retellApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            webhook_url: webhookUrl
          })
        })

        if (!retellResponse.ok) {
          const errorData = await retellResponse.json().catch(() => ({}))
          throw new Error(`Retell API error: ${retellResponse.statusText} - ${JSON.stringify(errorData)}`)
        }

        // Update in database
        await prisma.bot.update({
          where: { id: bot.id },
          data: { webhookUrl }
        })

        results.push({
          botId: bot.id,
          botName: bot.name,
          success: true,
          webhookUrl
        })
      } catch (error: any) {
        results.push({
          botId: bot.id,
          botName: bot.name,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount}/${bots.length} bot updated successfully`,
      webhookUrl,
      results
    })
  } catch (error: any) {
    console.error("Error fixing webhooks:", error)
    return NextResponse.json(
      { error: "Failed to fix webhooks", details: error.message },
      { status: 500 }
    )
  }
}
