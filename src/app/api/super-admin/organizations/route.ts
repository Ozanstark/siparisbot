import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/super-admin/organizations - Get all organizations with stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true }
    })

    if (!user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      )
    }

    // Get all organizations with stats
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            bots: true,
            phoneNumbers: true,
            calls: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Calculate usage percentages and format data
    const organizationStats = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      subscriptionPlan: org.subscriptionPlan,
      monthlyCallMinutes: org.monthlyCallMinutes,
      maxMonthlyCallMinutes: org.maxMonthlyCallMinutes,
      usagePercentage:
        org.maxMonthlyCallMinutes > 0
          ? (org.monthlyCallMinutes / org.maxMonthlyCallMinutes) * 100
          : 0,
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.currentPeriodEnd,
      userCount: org._count.users,
      botCount: org._count.bots,
      phoneCount: org._count.phoneNumbers,
      callCount: org._count.calls
    }))

    // Calculate global totals
    const totals = {
      totalOrgs: organizations.length,
      totalUsers: organizations.reduce((sum, org) => sum + org._count.users, 0),
      totalBots: organizations.reduce((sum, org) => sum + org._count.bots, 0),
      totalCalls: organizations.reduce((sum, org) => sum + org._count.calls, 0),
      totalMinutes: organizations.reduce(
        (sum, org) => sum + org.monthlyCallMinutes,
        0
      )
    }

    return NextResponse.json({
      organizations: organizationStats,
      totals
    })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}
