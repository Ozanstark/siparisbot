import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { z } from "zod"

export const dynamic = "force-dynamic"

const reservationSchema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    guests: z.number().min(1),
    roomType: z.string(),
    guestName: z.string().min(2),
    guestPhone: z.string().optional(), // Made optional
    specialRequests: z.string().optional()
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const data = reservationSchema.parse(body)

        // 1. Find the room type
        // In a real multi-tenant scenario with Retell, we need to know WHICH hotel this call belongs to.
        // Retell sends `agent_id` in the webhook. We can look up the bot, then the org/user.
        // HOWEVER, standard tool calls might not send agent_id in the body unless we added it to args?
        // OR: Retell might send call_id / agent_id in headers or as part of the tool call wrapper?
        // Retell custom API tools usually hit the URL with the args.
        // We need to identify the TENANT.

        // Strategy: We will loosely search for the roomType across ALL active hotel customers?
        // NO, that's dangerous (names are not unique).

        // Solution: We need the Bot ID or Agent ID to know the context.
        // For now, let's assume we can pass `agent_id` if we modify the tool definition to include keys?
        // OR easier: We search for the Room Type name. If unique enough? No.

        // Better: Retell passes `call_id` and `agent_id` in the tool call request payload usually?
        // Actually for "Custom Functions", Retell sends: { args: {...}, call_id: "...", agent_id: "..." }
        // So we CAN get the agent_id from the body!

        const agentId = body.agent_id
        if (!agentId) {
            // Fallback: If testing manually
            // But in production we need this.
            // Let's rely on finding a room type that matches the name loosely for now if agent_id missing?
            // No, let's try to lookup the agent.
        }

        let roomTypeId: string | null = null
        let customerId: string | null = null

        let guestPhone = data.guestPhone // Mutable variable

        if (agentId) {
            const bot = await prisma.bot.findUnique({
                where: { retellAgentId: agentId },
                include: { organization: true }
            })

            if (bot) {
                // Feature: Auto-detect phone number from Call ID if not provided
                if (!guestPhone && body.call_id) {
                    try {
                        // Use raw API to ensure robust fetching
                        const call = await callRetellApi("GET", `/get-call/${body.call_id}`, null, bot.organizationId)
                        guestPhone = call.from_number
                    } catch (err) {
                        console.warn("Could not retrieve call details for phone number:", err)
                    }
                }

                // Find room type in this organization
                const room = await prisma.roomType.findFirst({
                    where: {
                        organizationId: bot.organizationId,
                        name: { contains: data.roomType, mode: "insensitive" },
                        isActive: true
                    }
                })

                if (room) {
                    roomTypeId = room.id
                    customerId = room.customerId // Hotel owner
                }
            }
        }

        // If we still don't have a room, we might have to fail or "Force Book" a placeholder?
        // Let's create a pending reservation even if room type is ambiguous, but better to fail.
        if (!roomTypeId || !customerId) {
            return NextResponse.json({
                success: false,
                message: "Oda tipi bulunamadı. Lütfen tam adını söyleyiniz." // Room type not found
            })
        }

        // 2. Create Reservation
        const reservation = await prisma.reservation.create({
            data: {
                customerId: customerId,
                callId: body.call_id || "manual-" + Date.now(), // Link to call if possible
                guestName: data.guestName,
                guestPhone: guestPhone || "Unknown", // Fallback if still missing
                checkIn: new Date(data.checkIn),
                checkOut: new Date(data.checkOut),
                numberOfGuests: data.guests,
                roomTypeId: roomTypeId,
                roomType: data.roomType, // Fallback name
                status: "PENDING", // Confirmed but payment pending / staff review
                specialRequests: data.specialRequests
            }
        })

        // 3. Return booking code
        // We can use the ID suffix or a generated code.
        const code = reservation.id.slice(-6).toUpperCase()

        return NextResponse.json({
            success: true,
            confirmationCode: code,
            message: `Rezervasyon oluşturuldu! Onay kodunuz: ${code}. Bizi tercih ettiğiniz için teşekkürler.`
        })

    } catch (error) {
        console.error("Reservation failed:", error)
        return NextResponse.json(
            { error: "Failed to create reservation" },
            { status: 500 }
        )
    }
}
