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
            skipped: 0
        }

        for (const phone of retellNumbers) {
            try {
                const existingPhone = await prisma.phoneNumber.findFirst({
                    where: {
                        number: phone.phone_number,
                        organizationId
                    }
                })

                if (existingPhone) {
                    await prisma.phoneNumber.update({
                        where: { id: existingPhone.id },
                        data: {
                            retellPhoneNumberId: phone.phone_number,
                            inboundAgentId: phone.inbound_agent_id || null,
                            outboundAgentId: phone.outbound_agent_id || null,
                            nickname: phone.nickname || existingPhone.nickname,
                            updatedAt: new Date()
                        }
                    })
                    results.updated++
                } else {
                    await prisma.phoneNumber.create({
                        data: {
                            number: phone.phone_number,
                            retellPhoneNumberId: phone.phone_number,
                            organizationId,
                            inboundAgentId: phone.inbound_agent_id || null,
                            outboundAgentId: phone.outbound_agent_id || null,
                            nickname: phone.nickname || null,
                            isActive: true
                        }
                    })
                    results.created++
                }
            } catch (error) {
                console.error(`Error processing number ${phone.phone_number}:`, error)
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
