import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

const updateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
}).refine((data) => {
    if (data.newPassword && !data.currentPassword) {
        return false
    }
    return true
}, {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
})

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const data = updateProfileSchema.parse(body)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const updates: any = {}

        if (data.name) {
            updates.name = data.name
        }

        if (data.newPassword && data.currentPassword) {
            // Verify current password
            const isValid = await bcrypt.compare(data.currentPassword, user.hashedPassword)
            if (!isValid) {
                return NextResponse.json({ error: "Incorrect current password" }, { status: 400 })
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(data.newPassword, 12)
            updates.hashedPassword = hashedPassword
        }

        if (Object.keys(updates).length > 0) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: updates
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Profile update error:", error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }
}
