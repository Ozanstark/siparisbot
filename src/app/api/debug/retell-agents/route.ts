import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId } = session.user

    try {
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { retellApiKey: true }
        })

        if (!organization?.retellApiKey) {
            return NextResponse.json({ error: "API Key missing" })
        }

        const response = await fetch("https://api.retellai.com/list-agents", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${organization.retellApiKey}`,
                "Content-Type": "application/json"
            }
        })

        if (!response.ok) {
            return NextResponse.json({
                error: "Retell API Error",
                status: response.status,
                text: await response.text()
            })
        }

        const data = await response.json()
        return NextResponse.json({
            count: data.length,
            raw_agents: data
        }, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
