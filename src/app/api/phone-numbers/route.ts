import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/phone-numbers - List all phone numbers from Retell and database
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
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

    // Fetch phone numbers from Retell API
    const response = await fetch("https://api.retellai.com/list-phone-numbers", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${organization.retellApiKey}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const retellPhoneNumbers = await response.json()

    // Get phone numbers from database with relation data
    const dbPhoneNumbers = await prisma.phoneNumber.findMany({
      where: {
        organizationId,
        ...(role === "CUSTOMER" && {
          assignedToUserId: userId
        })
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        inboundAgent: {
          select: { id: true, name: true }
        },
        outboundAgent: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Merge Retell data with database data
    const mergedPhoneNumbers = retellPhoneNumbers.map((retellPhone: any) => {
      const dbPhone = dbPhoneNumbers.find(
        (db) => db.number === retellPhone.phone_number
      )

      return {
        ...retellPhone,
        dbData: dbPhone || null
      }
    })

    return NextResponse.json({
      phoneNumbers: mergedPhoneNumbers,
      total: mergedPhoneNumbers.length
    })
  } catch (error: any) {
    console.error("Error fetching phone numbers:", error)
    return NextResponse.json(
      { error: "Failed to fetch phone numbers", details: error.message },
      { status: 500 }
    )
  }
}
