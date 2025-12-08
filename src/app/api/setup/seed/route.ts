import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

// POST /api/setup/seed - Fix existing data and seed defaults
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  // Only ADMIN or SUPER_ADMIN can run setup
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    // Fix 1: Set default customerType for existing CUSTOMER users
    const updatedCustomers = await prisma.user.updateMany({
      where: {
        role: "CUSTOMER",
        customerType: null
      },
      data: {
        customerType: "RESTAURANT" // Default to RESTAURANT
      }
    })

    console.log(`✓ Updated ${updatedCustomers.count} customers with default customerType`)

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      details: {
        customersUpdated: updatedCustomers.count
      }
    })
  } catch (error) {
    console.error("Error running setup:", error)
    return NextResponse.json(
      { error: "Failed to run setup" },
      { status: 500 }
    )
  }
}
