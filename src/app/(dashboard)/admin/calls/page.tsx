import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CallTable from "@/components/calls/call-table"

export const dynamic = "force-dynamic"

export default async function AdminCallsPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
        redirect("/login")
    }

    const calls = await prisma.call.findMany({
        where: {
            organizationId: session.user.organizationId,
        },
        include: {
            bot: { select: { id: true, name: true } },
            initiatedBy: { select: { id: true, name: true, email: true } },
            analytics: true
        },
        orderBy: { createdAt: "desc" },
        take: 50 // Limit to last 50 calls for now
    })

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistem Görüşmeleri</h1>
                    <p className="text-gray-600 mt-1">Tüm görüşme kayıtlarını ve analizlerini görüntüleyin</p>
                </div>
            </div>

            <CallTable calls={calls} isAdmin={true} />
        </div>
    )
}
