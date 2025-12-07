import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSettingsSchema = z.object({
  retellApiKey: z.string().optional(),
  retellWebhookSecret: z.string().optional(),
})

// GET /api/admin/settings - Get organization settings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        retellApiKey: true,
        retellWebhookSecret: true,
        createdAt: true,
      }
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Mask sensitive data for display
    const settings = {
      ...organization,
      retellApiKey: organization.retellApiKey
        ? `${organization.retellApiKey.slice(0, 8)}...${organization.retellApiKey.slice(-4)}`
        : null,
      retellWebhookSecret: organization.retellWebhookSecret
        ? `${organization.retellWebhookSecret.slice(0, 8)}...${organization.retellWebhookSecret.slice(-4)}`
        : null,
      hasRetellApiKey: !!organization.retellApiKey,
      hasWebhookSecret: !!organization.retellWebhookSecret,
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Update organization settings
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = updateSettingsSchema.parse(body)

    // Prepare update data - only update provided fields
    const updateData: any = {}

    if (data.retellApiKey !== undefined) {
      // Validate API key format (Retell keys start with "key_")
      if (data.retellApiKey && !data.retellApiKey.startsWith("key_")) {
        return NextResponse.json(
          { error: "Invalid Retell API key format (should start with 'key_')" },
          { status: 400 }
        )
      }
      updateData.retellApiKey = data.retellApiKey || null
    }

    if (data.retellWebhookSecret !== undefined) {
      updateData.retellWebhookSecret = data.retellWebhookSecret || null
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        retellApiKey: true,
        retellWebhookSecret: true,
      }
    })

    // Mask for response
    return NextResponse.json({
      success: true,
      settings: {
        ...organization,
        retellApiKey: organization.retellApiKey
          ? `${organization.retellApiKey.slice(0, 8)}...${organization.retellApiKey.slice(-4)}`
          : null,
        retellWebhookSecret: organization.retellWebhookSecret
          ? `${organization.retellWebhookSecret.slice(0, 8)}...${organization.retellWebhookSecret.slice(-4)}`
          : null,
        hasRetellApiKey: !!organization.retellApiKey,
        hasWebhookSecret: !!organization.retellWebhookSecret,
      }
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
