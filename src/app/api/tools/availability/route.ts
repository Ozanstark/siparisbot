import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema for the tool arguments
const availabilityCheckSchema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    guests: z.number().min(1).default(1),
    roomType: z.string().optional() // Optional room type name preference
})

export async function POST(req: NextRequest) {
    // Verify basic auth or secret (Retell usually sends secret header if configured, but for simplicity we might skip complex auth or check for a custom header if we configured it)
    // Ideally we should check strict "x-retell-webhook-secret" but standard function calling often just hits the endpoint.
    // For now, let's keep it public or valid secret check if present.

    try {
        const body = await req.json()
        // Retell might wrap arguments in "args" or send flat. Let's assume Retell sends arguments as body.
        // If this is a Retell structured call, the body matches the function arguments.

        const { checkIn, checkOut, guests, roomType } = availabilityCheckSchema.parse(body)

        const startDate = new Date(checkIn)
        const endDate = new Date(checkOut)

        // 1. Find relevant room types (matching guest capacity)
        const roomTypes = await prisma.roomType.findMany({
            where: {
                isActive: true,
                maxGuests: { gte: guests },
                name: roomType ? { contains: roomType, mode: "insensitive" } : undefined
            }
        })

        if (roomTypes.length === 0) {
            return NextResponse.json({
                available: false,
                message: "Maalesef bu kişi sayısı için uygun odamız bulunmuyor veya aradığınız kriterde oda yok."
            })
        }

        // 2. Check reservations for each room type
        const availableRooms = []

        for (const room of roomTypes) {
            // 1. Check for Blocked Dates (Stop Sell)
            // checkOut day doesn't matter for availability if they leave in the morning, 
            // but we need to ensure every night of stay is unblocked.
            // Range: [startDate, endDate)
            const blockedDatesCount = await prisma.roomAvailability.count({
                where: {
                    roomTypeId: room.id,
                    isBlocked: true,
                    date: {
                        gte: startDate,
                        lt: endDate
                    }
                }
            })

            if (blockedDatesCount > 0) {
                // Room is closed for at least one night of the stay
                continue
            }

            // 2. Count confirmed reservations that overlap with requested dates
            const bookings = await prisma.reservation.count({
                where: {
                    roomTypeId: room.id,
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                    OR: [
                        {
                            // Booking starts during request
                            checkIn: { lte: endDate, gte: startDate }
                        },
                        {
                            // Booking ends during request
                            checkOut: { lte: endDate, gte: startDate }
                        },
                        {
                            // Booking covers the whole request
                            checkIn: { lte: startDate },
                            checkOut: { gte: endDate }
                        }
                    ]
                }
            })

            const availableCount = room.totalRooms - bookings

            if (availableCount > 0) {
                availableRooms.push({
                    name: room.name,
                    price: room.pricePerNight,
                    availableCount,
                    description: room.description
                })
            }
        }

        if (availableRooms.length === 0) {
            return NextResponse.json({
                available: false,
                message: "İstediğiniz tarihlerde ( " + checkIn + " - " + checkOut + " ) maalesef boş odamız kalmadı."
            })
        }

        // Success response
        const lowestPrice = Math.min(...availableRooms.map(r => r.price))

        return NextResponse.json({
            available: true,
            rooms: availableRooms,
            lowestPrice,
            message: `Evet, ${checkIn} girişli ${availableRooms.length} farklı oda tipimiz müsait. Fiyatlarımız gecelik ${lowestPrice} TL'den başlıyor.`
        })

    } catch (error) {
        console.error("Availability check failed:", error)
        return NextResponse.json(
            { error: "Failed to check availability" },
            { status: 500 }
        )
    }
}
