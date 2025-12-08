import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import ReservationList from "@/components/reservations/reservation-list"

export const dynamic = "force-dynamic"

async function getReservations() {
    const session = await getServerSession(authOptions)
    // We can call the API internally or use Prisma directly since this is a server component.
    // Making it self-contained is better for reusability but direct DB is faster.
    // Let's rely on the API Route we just built to keep logic in one place?
    // Actually, calling own API in Server Component needs absolute URL.
    // Better to just query Prisma directly here for simplicity and perf.

    // BUT, the API route handles filtering logic. I'll duplicate minimal logic here.
    const { prisma } = require("@/lib/prisma") // lazy load

    if (!session?.user) return []

    const reservations = await prisma.reservation.findMany({
        where: {
            customerId: session.user.id
        },
        orderBy: {
            createdAt: "desc"
        }
    })

    // Convert dates to strings for serialization
    return reservations.map((r: any) => ({
        ...r,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
    }))
}

export default async function ReservationsPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "CUSTOMER" || session.user.customerType !== "HOTEL") {
        redirect("/customer/dashboard")
    }

    const reservations = await getReservations()

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Rezervasyonlar</h1>
                    <p className="text-gray-500 mt-1">Botunuz üzerinden alınan rezervasyon talepleri.</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium text-sm">
                    Toplam: {reservations.length}
                </div>
            </div>

            <ReservationList initialReservations={reservations} />
        </div>
    )
}
