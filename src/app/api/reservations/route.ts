import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, role, id: userId, customerType } = session.user

    if (role === "CUSTOMER" && customerType !== "HOTEL") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const reservations = await prisma.reservation.findMany({
            where: {
                // If CUSTOMER (Hotel), show only their reservations
                // If ADMIN, show all (or filter by org?)
                ...(role === "CUSTOMER" ? {
                    // We need to find rooms owned by this customer?
                    // Wait, reservation has `customerId`.
                    customerId: userId
                } : {
                    customer: {
                        organizationId: organizationId
                    }
                })
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json({ reservations })

    } catch (error) {
        console.error("Error fetching reservations:", error)
        return NextResponse.json(
            { error: "Failed to fetch reservations" },
            { status: 500 }
        )
    }
}
