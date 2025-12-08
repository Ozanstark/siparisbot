"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface AvailabilityCalendarProps {
    roomTypeId: string
    roomName: string
}

export function AvailabilityCalendar({ roomTypeId, roomName }: AvailabilityCalendarProps) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [blockedDates, setBlockedDates] = useState<Date[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Fetch blocked dates on mount
    useEffect(() => {
        fetchAvailability()
    }, [roomTypeId])

    const fetchAvailability = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/rooms/${roomTypeId}/availability`)
            if (res.ok) {
                const data = await res.json()
                // Convert string dates to Date objects
                const dates = data.blockedDates.map((d: string) => new Date(d))
                setBlockedDates(dates)
            }
        } catch (e) {
            console.error("Failed to fetch availability", e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDayClick = async (day: Date) => {
        if (isUpdating) return

        // Check if already blocked
        const isBlocked = blockedDates.some(
            (d) => d.toDateString() === day.toDateString()
        )

        // Optimistic UI update
        const newBlockedDates = isBlocked
            ? blockedDates.filter(d => d.toDateString() !== day.toDateString())
            : [...blockedDates, day]

        setBlockedDates(newBlockedDates)
        setIsUpdating(true)

        try {
            const res = await fetch(`/api/rooms/${roomTypeId}/availability`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: day.toISOString(),
                    isBlocked: !isBlocked
                })
            })

            if (!res.ok) {
                throw new Error("Update failed")
            }
        } catch (e) {
            // Revert on error
            console.error(e)
            setBlockedDates(blockedDates)
            alert("Tarih güncellenemedi, lütfen tekrar deneyin.")
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Takvim / Müsaitlik
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{roomName} - Müsaitlik Takvimi</DialogTitle>
                    <DialogDescription>
                        Kapatmak istediğiniz günlerin üzerine tıklayın. Kırmızı işaretli günler "Dolu" olarak görünecektir.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4">
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    ) : (
                        <>
                            <Calendar
                                mode="multiple"
                                selected={blockedDates}
                                onDayClick={handleDayClick}
                                className="rounded-md border shadow"
                                modifiers={{
                                    blocked: blockedDates
                                }}
                                modifiersStyles={{
                                    blocked: {
                                        backgroundColor: "#fee2e2",
                                        color: "#ef4444",
                                        textDecoration: "line-through",
                                        fontWeight: "bold"
                                    }
                                }}
                                locale={tr} // Turkish locale
                            />
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div>
                                <span>Kapalı / Dolu Günler</span>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
