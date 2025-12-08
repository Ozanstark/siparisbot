"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Users, BedDouble, Check } from "lucide-react"

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

export default function RoomCard({ room, onEdit, onDelete }: RoomCardProps) {
    return (
        <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${room.isActive ? 'border-l-green-500' : 'border-l-gray-300'}`}>
            <CardHeader className="pb-3 space-y-0">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            {room.name}
                            {!room.isActive && (
                                <Badge variant="secondary" className="text-xs">Pasif</Badge>
                            )}
                        </CardTitle>
                        {room.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">{room.description}</p>
                        )}
                    </div>
                    <Badge variant="outline" className="font-mono text-lg px-2 py-1">
                        {room.pricePerNight} ₺ <span className="text-xs font-normal text-gray-500 ml-1">/ gece</span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-2 gap-4 py-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BedDouble className="h-4 w-4 text-primary" />
                        <span className="font-medium">{room.totalRooms} Adet</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Max {room.maxGuests} Kişi</span>
                    </div>
                </div>

                {room.features.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {room.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                                {feature}
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(room)}
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Düzenle
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(room.id, room.name)}
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sil
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
