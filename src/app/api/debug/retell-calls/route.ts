import { NextRequest, NextResponse } from "next/server"
import { callRetellApi } from "@/lib/retell"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.RETELL_API_KEY
        const isConfigured = !!apiKey
        const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "not_set"

        console.log("Debug: Attempting to fetch calls from Retell...")

        // Attempt to fetch calls
        const data = await callRetellApi("GET", "/list-calls")

        return NextResponse.json({
            status: "success",
            env_check: {
                RETELL_API_KEY_CONFIGURED: isConfigured,
                KEY_PREVIEW: maskedKey
            },
            data
        })
    } catch (error: any) {
        console.error("Debug: Retell fetch error:", error)
        return NextResponse.json({
            status: "error",
            error: error.message,
            env_check: {
                RETELL_API_KEY_CONFIGURED: !!process.env.RETELL_API_KEY,
            }
        }, { status: 500 })
    }
}
