import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateRoomSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    totalRooms: z.number().min(1).optional(),
    pricePerNight: z.number().min(0).optional(),
    maxGuests: z.number().min(1).optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
})

export async function PUT(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "CUSTOMER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const data = updateRoomSchema.parse(body)

        // Verify ownership
        const existingRoom = await prisma.roomType.findFirst({
            where: {
                id: params.roomId,
                customerId: session.user.id
            }
        })

        if (!existingRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        const room = await prisma.roomType.update({
            where: { id: params.roomId },
            data
        })

        return NextResponse.json({ room })
    } catch (error) {
        console.error("Error updating room:", error)
        return NextResponse.json(
            { error: "Failed to update room" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "CUSTOMER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    try {
        // Verify ownership
        const existingRoom = await prisma.roomType.findFirst({
            where: {
                id: params.roomId,
                customerId: session.user.id
            }
        })

        if (!existingRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        await prisma.roomType.delete({
            where: { id: params.roomId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting room:", error)
        return NextResponse.json(
            { error: "Failed to delete room" },
            { status: 500 }
        )
    }
}
