import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Validation Schema
const createRoomSchema = z.object({
    name: z.string().min(2, "Room name is required"),
    description: z.string().optional(),
    totalRooms: z.number().min(1, "Total rooms must be at least 1"),
    pricePerNight: z.number().min(0, "Price must be positive"),
    maxGuests: z.number().min(1).default(2),
    features: z.array(z.string()).optional()
})

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const rooms = await prisma.roomType.findMany({
            where: {
                organizationId: session.user.organizationId,
                customerId: session.user.role === "CUSTOMER" ? session.user.id : undefined
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ rooms })
    } catch (error) {
        console.error("Error fetching rooms:", error)
        return NextResponse.json(
            { error: "Failed to fetch rooms" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "CUSTOMER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (session.user.customerType !== "HOTEL") {
        return NextResponse.json({ error: "Only hotels can create rooms" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const data = createRoomSchema.parse(body)

        const room = await prisma.roomType.create({
            data: {
                ...data,
                organizationId: session.user.organizationId,
                customerId: session.user.id
            }
        })

        return NextResponse.json({ room }, { status: 201 })
    } catch (error) {
        console.error("Error creating room:", error)
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid input", details: error.errors },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { error: "Failed to create room" },
            { status: 500 }
        )
    }
}
