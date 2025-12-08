"use client"

import { useState, useEffect } from "react"
import { Plus, Hotel } from "lucide-react"
import AddRoomDialog from "@/components/rooms/add-room-dialog"
import RoomCard from "@/components/rooms/room-card"

interface RoomType {
    id: string
    name: string
    description?: string | null
    totalRooms: number
    pricePerNight: number
    maxGuests: number
    features: string[]
    isActive: boolean
}

export default function CustomerRoomsPage() {
    const [rooms, setRooms] = useState<RoomType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRoom, setEditingRoom] = useState<RoomType | null>(null)

    const fetchRooms = async () => {
        try {
            const response = await fetch("/api/rooms")
            if (response.ok) {
                const data = await response.json()
                setRooms(data.rooms || [])
            }
        } catch (error) {
            console.error("Failed to fetch rooms:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRooms()
    }, [isDialogOpen]) // Refresh when dialog closes (optimized to manual trigger inside dialog close if better)

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name} adlı odayı silmek istediğinize emin misiniz?`)) return

        try {
            const response = await fetch(`/api/rooms/${id}`, { method: "DELETE" })
            if (response.ok) {
                fetchRooms()
            }
        } catch (error) {
            console.error("Delete failed", error)
        }
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Oda Yönetimi</h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        Otelinizin oda tiplerini ve stoklarını buradan yönetin.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingRoom(null)
                        setIsDialogOpen(true)
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm hover:shadow-md"
                >
                    <Plus className="h-5 w-5" />
                    Yeni Oda Ekle
                </button>
            </div>

            {rooms.length === 0 && !isLoading ? (
                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                    <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                        <Hotel className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Henüz oda eklenmemiş</h3>
                    <p className="text-gray-500 mt-1 mb-6">Müsaitlik kontrolü için oda tiplerinizi tanımlayın.</p>
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        İlk odayı ekle &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rooms.map(room => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            onEdit={(r) => {
                                setEditingRoom(r)
                                setIsDialogOpen(true)
                            }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <AddRoomDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false)
                    setEditingRoom(null)
                }}
                initialData={editingRoom}
            />
        </div>
    )
}
