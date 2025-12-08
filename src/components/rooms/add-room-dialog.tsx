"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog" // We need to ensure Dialog present or use standard
// Assuming standard Radix primitives or standard HTML if shadcn dialog not fully installed or we want simple modal.
// I will use standard HTML fixed div for simplicity as per AddCustomerDialog pattern if I am not sure about UI library state.
// But we used shadcn components in previous steps, so I will try to use the pattern I used in AddCustomerDialog (which uses custom div implementation).
// Actually AddCustomerDialog used custom div. I will stick to that to be safe.

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

interface AddRoomDialogProps {
    isOpen: boolean
    onClose: () => void
    initialData?: RoomType | null
}

const COMMON_FEATURES = [
    "Deniz Manzaralı", "Balkon", "Jakuzi", "Wi-Fi", "Kahvaltı Dahil", "Minibar", "Klima", "TV"
]

export default function AddRoomDialog({ isOpen, onClose, initialData }: AddRoomDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        totalRooms: 1,
        pricePerNight: 0,
        maxGuests: 2,
        features: [] as string[]
    })

    // Reset or Load Data
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description || "",
                totalRooms: initialData.totalRooms,
                pricePerNight: initialData.pricePerNight,
                maxGuests: initialData.maxGuests,
                features: initialData.features
            })
        } else {
            setFormData({
                name: "",
                description: "",
                totalRooms: 1,
                pricePerNight: 0,
                maxGuests: 2,
                features: []
            })
        }
    }, [initialData, isOpen])

    const toggleFeature = (feature: string) => {
        setFormData(prev => {
            const exists = prev.features.includes(feature)
            if (exists) {
                return { ...prev, features: prev.features.filter(f => f !== feature) }
            } else {
                return { ...prev, features: [...prev.features, feature] }
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const url = initialData ? `/api/rooms/${initialData.id}` : "/api/rooms"
            const method = initialData ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to save room")
            }

            router.refresh()
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-10">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl relative">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                    {initialData ? "Oda Düzenle" : "Yeni Oda Ekle"}
                </h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Oda Tipi Adı *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Örn: Deluxe Suit"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Toplam Stok *</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.totalRooms}
                                onChange={(e) => setFormData({ ...formData, totalRooms: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kapasite (Kişi) *</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.maxGuests}
                                onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gecelik Fiyat (₺) *</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.pricePerNight}
                            onChange={(e) => setFormData({ ...formData, pricePerNight: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-mono"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Açıklama</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Oda özelliklerini detaylandırın..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Özellikler</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_FEATURES.map(feature => (
                                <button
                                    key={feature}
                                    type="button"
                                    onClick={() => toggleFeature(feature)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${formData.features.includes(feature)
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    {feature}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? "Kaydediliyor..." : initialData ? "Güncelle" : "Oluştur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
