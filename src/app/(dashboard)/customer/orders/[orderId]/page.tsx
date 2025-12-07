"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card"
import { Button } from "../../../../../components/ui/button"
import { Badge } from "../../../../../components/ui/badge"
import { ArrowLeft, Phone, MapPin, Clock, FileText, PlayCircle, Check, ChefHat, X } from "lucide-react"

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

interface Order {
  id: string
  customerName: string
  customerPhone: string | null
  items: string
  totalAmount: number | null
  deliveryAddress: string | null
  notes: string | null
  status: OrderStatus
  createdAt: string
  completedAt: string | null
  call: {
    id: string
    retellCallId: string
    transcript: string | null
    recordingUrl: string | null
    createdAt: string
    durationMs: number | null
  }
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-red-500",
  PREPARING: "bg-yellow-500",
  READY: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-500"
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Bekliyor",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi"
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders`)
      if (response.ok) {
        const data = await response.json()
        const foundOrder = data.orders.find((o: Order) => o.id === orderId)
        setOrder(foundOrder || null)
      }
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrder()
      }
    } catch (error) {
      console.error("Error updating order:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return "Bilinmiyor"
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-xl text-gray-600">Sipariş bulunamadı</p>
            <Button className="mt-4" onClick={() => router.push("/customer/orders")}>
              Siparişlere Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push("/customer/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Sipariş Detayları</h1>
          <p className="text-gray-600 mt-1">#{order.id.slice(0, 8)}</p>
        </div>
        <Badge className={`${statusColors[order.status]} text-white text-lg px-4 py-2`}>
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Müşteri Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Müşteri</p>
                <p className="font-semibold">{order.customerName}</p>
              </div>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="font-semibold">{order.customerPhone}</p>
                </div>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Teslimat Adresi</p>
                  <p className="font-semibold">{order.deliveryAddress}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sipariş Detayları */}
        <Card>
          <CardHeader>
            <CardTitle>Sipariş İçeriği</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-lg">{order.items}</p>
            </div>
            {order.totalAmount && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-semibold">Toplam Tutar:</span>
                <span className="text-2xl font-bold text-green-600">
                  {order.totalAmount.toFixed(2)} TL
                </span>
              </div>
            )}
            {order.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Notlar:</p>
                <p className="text-gray-800">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zaman Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Zaman Çizelgesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Sipariş Zamanı</p>
                <p className="font-semibold">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            {order.completedAt && (
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Tamamlanma Zamanı</p>
                  <p className="font-semibold">{formatDate(order.completedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Görüşme Süresi</p>
                <p className="font-semibold">{formatDuration(order.call.durationMs)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Görüşme Kaydı */}
        {order.call.transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Görüşme Kaydı (Transcript)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm">{order.call.transcript}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ses Kaydı */}
        {order.call.recordingUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Ses Kaydı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <audio controls className="w-full">
                <source src={order.call.recordingUrl} type="audio/mpeg" />
                Tarayıcınız ses oynatmayı desteklemiyor.
              </audio>
            </CardContent>
          </Card>
        )}

        {/* Aksiyon Butonları */}
        {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Aksiyonları</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              {order.status === "PENDING" && (
                <Button
                  className="flex-1"
                  onClick={() => updateOrderStatus("PREPARING")}
                >
                  <ChefHat className="h-4 w-4 mr-2" />
                  Hazırlamaya Başla
                </Button>
              )}
              {order.status === "PREPARING" && (
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={() => updateOrderStatus("READY")}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Hazır
                </Button>
              )}
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => updateOrderStatus("COMPLETED")}
              >
                <Check className="h-4 w-4 mr-2" />
                Tamamlandı
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateOrderStatus("CANCELLED")}
              >
                <X className="h-4 w-4 mr-2" />
                İptal Et
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
