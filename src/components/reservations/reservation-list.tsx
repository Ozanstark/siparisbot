"use client"

import { useState } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, User, Home, Clock } from "lucide-react"

interface Reservation {
    id: string
    guestName: string
    guestPhone: string
    checkIn: string
    checkOut: string
    numberOfGuests: number
    roomType: string
    status: string
    createdAt: string
    callId: string
    confirmationCode?: string // If we add this column later, or use formatting
}

interface ReservationListProps {
    initialReservations: Reservation[]
}

export default function ReservationList({ initialReservations }: ReservationListProps) {
    const [reservations, setReservations] = useState<Reservation[]>(initialReservations)

    if (reservations.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Henüz Rezervasyon Yok</h3>
                <p className="mt-1 text-sm text-gray-500">Botunuz üzerinden alınan rezervasyonlar burada listelenecektir.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {reservations.map((res) => (
                <Card key={res.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row border-l-4 border-blue-500">
                        <div className="flex-1 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant={res.status === "PENDING" ? "secondary" : "default"} className="uppercase">
                                        {res.status === "PENDING" ? "Beklemede" : res.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500 font-mono">#{res.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(res.createdAt), "dd MMM HH:mm", { locale: tr })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {res.guestName}
                                    </h3>
                                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {res.guestPhone}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Home className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{res.roomType}</span>
                                        <span className="text-gray-500">({res.numberOfGuests} Kişi)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded w-fit">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(res.checkIn), "dd MMM", { locale: tr })} - {format(new Date(res.checkOut), "dd MMM yyyy", { locale: tr })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
