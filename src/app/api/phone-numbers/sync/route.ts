import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, id: userId } = session.user

    try {
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { retellApiKey: true }
        })

        if (!organization?.retellApiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 400 })
        }

        const response = await fetch("https://api.retellai.com/list-phone-numbers", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${organization.retellApiKey}`,
                "Content-Type": "application/json"
            }
        })

        if (!response.ok) {
            throw new Error(`Retell API error: ${response.statusText}`)
        }

        const retellNumbers = await response.json()
        console.log(`Found ${retellNumbers.length} numbers in Retell`)

        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [] as string[]
        }

        // Create a map of Retell Agent ID -> Local Bot ID
        const bots = await prisma.bot.findMany({
            where: { organizationId },
            select: { id: true, retellAgentId: true }
        })
        console.log(`[Sync] Found ${bots.length} local bots for Agent Id mapping`)
        const agentMap = new Map(bots.map(b => [b.retellAgentId, b.id]))

        for (const phone of retellNumbers) {
            console.log(`[Sync] Processing number: ${phone.phone_number}`)
            try {
                const existingPhone = await prisma.phoneNumber.findUnique({
                    where: {
                        number: phone.phone_number
                    }
                })
                console.log(`[Sync] Found existing phone in DB? ${!!existingPhone}`)

                // Resolve local bot IDs
                const localInboundId = phone.inbound_agent_id ? agentMap.get(phone.inbound_agent_id) : null
                const localOutboundId = phone.outbound_agent_id ? agentMap.get(phone.outbound_agent_id) : null

                console.log(`[Sync] Resolved Inbound Agent: ${phone.inbound_agent_id} -> ${localInboundId}`)

                if (existingPhone) {
                    await prisma.phoneNumber.update({
                        where: { id: existingPhone.id },
                        data: {
                            organizationId, // Claim ownership if it was different
                            retellPhoneNumberId: phone.phone_number,
                            inboundAgentId: localInboundId || null,
                            outboundAgentId: localOutboundId || null,
                            nickname: phone.nickname || existingPhone.nickname,
                            updatedAt: new Date()
                        }
                    })
                    results.updated++
                    results.updated++
                } else {
                    await prisma.phoneNumber.create({
                        data: {
                            number: phone.phone_number,
                            retellPhoneNumberId: phone.phone_number,
                            organizationId,
                            inboundAgentId: localInboundId || null,
                            outboundAgentId: localOutboundId || null,
                            nickname: phone.nickname || null,
                            isActive: true
                        }
                    })
                    results.created++
                    console.log(`[Sync] Created new phone record`)
                }
            } catch (error: any) {
                console.error(`[Sync] Error processing number ${phone.phone_number}:`, error)
                results.errors.push(`${phone.phone_number}: ${error.message}`)
                results.skipped++
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Sync completed: ${results.created} created, ${results.updated} updated`
        })

    } catch (error: any) {
        console.error("Error syncing phone numbers:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
