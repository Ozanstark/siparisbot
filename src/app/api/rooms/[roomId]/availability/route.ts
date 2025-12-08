import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const updateSchema = z.object({
    date: z.string().datetime(),
    isBlocked: z.boolean()
})

// GET /api/rooms/[roomId]/availability
export async function GET(
    req: Request,
    { params }: { params: { roomId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.customerType !== "HOTEL") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { roomId } = params

        // Fetch blocked dates
        const availability = await prisma.roomAvailability.findMany({
            where: {
                roomTypeId: roomId,
                isBlocked: true,
                date: {
                    gte: new Date() // Only future dates
                }
            },
            select: {
                date: true
            }
        })

        const blockedDates = availability.map(a => a.date.toISOString())

        return NextResponse.json({ blockedDates })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST /api/rooms/[roomId]/availability
export async function POST(
    req: Request,
    { params }: { params: { roomId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.customerType !== "HOTEL") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { roomId } = params
        const json = await req.json()
        const { date, isBlocked } = updateSchema.parse(json)

        const targetDate = new Date(date)
        // IMPORTANT: Normalize to midnight UTC or specific timezone to match query logic
        // For simplicity, we assume we store just the date part, but prisma DateTime is full timestamp.
        // We should strip time.
        targetDate.setHours(0, 0, 0, 0)

        if (isBlocked) {
            await prisma.roomAvailability.upsert({
                where: {
                    roomTypeId_date: {
                        roomTypeId: roomId,
                        date: targetDate
                    }
                },
                create: {
                    roomTypeId: roomId,
                    date: targetDate,
                    isBlocked: true
                },
                update: {
                    isBlocked: true
                }
            })
        } else {
            // Unblock = Delete the record (or set isBlocked false)
            await prisma.roomAvailability.deleteMany({
                where: {
                    roomTypeId: roomId,
                    date: targetDate
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
