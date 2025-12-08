"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Edit, Trash2, Users, BedDouble, Check, X,
    Wifi, Wind, Coffee, Wine, Bath, Tv, Waves, DoorOpen,
    MessageSquare, Loader2, Play
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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

interface RoomCardProps {
    room: RoomType
    onEdit: (room: RoomType) => void
    onDelete: (id: string, name: string) => void
}

const FEATURE_ICONS: Record<string, any> = {
    "Deniz Manzaralı": Waves,
    "Balkon": DoorOpen,
    "Jakuzi": Bath,
    "Wi-Fi": Wifi,
    "Kahvaltı Dahil": Coffee,
    "Minibar": Wine,
    "Klima": Wind,
    "TV": Tv
}

export default function RoomCard({ room, onEdit, onDelete }: RoomCardProps) {
    const [isQuickEditing, setIsQuickEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        pricePerNight: room.pricePerNight,
        totalRooms: room.totalRooms
    })

    // Bot Preview Generation
    const botDescription = `Merhaba! Harika bir ${room.name} seçeneğimiz var. ` +
        (room.features.includes("Deniz Manzaralı") ? "Muazzam bir deniz manzarasına sahip. " : "") +
        (room.features.includes("Kahvaltı Dahil") ? "Sabah kahvaltısı fiyata dahil. " : "") +
        `Maksimum ${room.maxGuests} kişi konaklayabiliyor. ` +
        `Gecelik fiyatımız sadece ${room.pricePerNight} TL. ` +
        (room.totalRooms < 3 ? "Şu an son odalarımız, kaçırmayın derim!" : "Müsaitliğimiz bulunuyor.")

    const handleQuickSave = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/rooms/${room.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!response.ok) throw new Error("Update failed")

            setIsQuickEditing(false)
            window.location.reload()
        } catch (error) {
            console.error(error)
            alert("Güncelleme başarısız oldu")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className={`group hover:shadow-xl transition-all duration-300 border-l-4 ${room.isActive ? 'border-l-green-500' : 'border-l-gray-300'} bg-white/50 backdrop-blur-sm`}>
            <CardHeader className="pb-3 space-y-0 relative">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            {room.name}
                            {!room.isActive && (
                                <Badge variant="secondary" className="text-xs">Pasif</Badge>
                            )}
                        </CardTitle>
                        {room.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{room.description}</p>
                        )}
                    </div>

                    {/* Quick Price Badge */}
                    <div
                        onClick={() => !isQuickEditing && setIsQuickEditing(true)}
                        className={`font-mono text-lg px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 cursor-pointer hover:bg-green-100 transition-colors ${isQuickEditing ? 'hidden' : ''}`}
                        title="Hızlı Düzenle"
                    >
                        {room.pricePerNight} <span className="text-sm">₺</span>
                    </div>

                    {/* Quick Edit Inputs */}
                    {isQuickEditing && (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                            <div className="flex flex-col gap-1">
                                <Input
                                    type="number"
                                    value={formData.pricePerNight}
                                    onChange={(e) => setFormData({ ...formData, pricePerNight: parseFloat(e.target.value) })}
                                    className="h-8 w-24 text-right pr-1"
                                    placeholder="Fiyat"
                                />
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={handleQuickSave} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-50" onClick={() => setIsQuickEditing(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 py-3 mb-4 bg-gray-50/50 rounded-lg px-2">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            <BedDouble className="h-4 w-4" />
                        </div>
                        {isQuickEditing ? (
                            <Input
                                type="number"
                                value={formData.totalRooms}
                                onChange={(e) => setFormData({ ...formData, totalRooms: parseInt(e.target.value) })}
                                className="h-7 w-20"
                            />
                        ) : (
                            <span className="font-medium">{room.totalRooms} Stok</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                            <Users className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Max {room.maxGuests} Kişi</span>
                    </div>
                </div>

                {/* Visual Icons Features */}
                {room.features.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {room.features.map((feature, idx) => {
                            const Icon = FEATURE_ICONS[feature] || Check
                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-100 shadow-sm rounded-md text-xs font-medium text-gray-600 hover:text-blue-600 hover:border-blue-100 transition-colors cursor-default"
                                    title={feature}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {feature}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Actions Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    {/* Bot Preview Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-2 px-2">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs font-semibold">Bot Önizleme</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 rounded-full">
                                        <MessageSquare className="h-5 w-5 text-purple-600" />
                                    </div>
                                    Bot Nasıl Sunacak?
                                </DialogTitle>
                                <DialogDescription>
                                    Müşteri bu odayı sorduğunda botun vermesi muhtemel cevap:
                                </DialogDescription>
                            </DialogHeader>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 italic text-gray-700 leading-relaxed relative">
                                <Play className="h-4 w-4 text-gray-300 absolute top-2 right-2" />
                                "{botDescription}"
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(room)}
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Detaylı Düzenle"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(room.id, room.name)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Sil"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
