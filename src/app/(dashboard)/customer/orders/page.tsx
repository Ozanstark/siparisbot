"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Badge } from "../../../../components/ui/badge"
import { Bell, Check, X, Clock, ChefHat, Eye, Settings } from "lucide-react"

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
  }
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-red-500 hover:bg-red-600",
  PREPARING: "bg-yellow-500 hover:bg-yellow-600",
  READY: "bg-blue-500 hover:bg-blue-600",
  COMPLETED: "bg-green-500 hover:bg-green-600",
  CANCELLED: "bg-gray-500 hover:bg-gray-600"
}

const statusIcons: Record<OrderStatus, any> = {
  PENDING: Bell,
  PREPARING: ChefHat,
  READY: Clock,
  COMPLETED: Check,
  CANCELLED: X
}

export default function LiveOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [settings, setSettings] = useState({
    soundEnabled: true,
    soundVolume: 70,
    autoRefresh: true,
    refreshInterval: 5000,
    showDesktopNotifications: true
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("orderNotificationSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders?status=PENDING")
      if (response.ok) {
        const data = await response.json()
        const newOrders = data.orders || []

        // Play sound and show notification if new orders arrived
        if (newOrders.length > previousOrderCount && previousOrderCount > 0) {
          // Sound notification
          if (settings.soundEnabled && audioRef.current) {
            audioRef.current.volume = settings.soundVolume / 100
            audioRef.current.play()
          }

          // Desktop notification
          if (settings.showDesktopNotifications && "Notification" in window && Notification.permission === "granted") {
            new Notification("Yeni Sipariş!", {
              body: `${newOrders.length - previousOrderCount} yeni sipariş geldi!`,
              icon: "/favicon.ico",
              tag: "new-order"
            })
          }
        }

        setOrders(newOrders)
        setPreviousOrderCount(newOrders.length)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh with configurable interval
  useEffect(() => {
    fetchOrders()
    if (settings.autoRefresh) {
      const interval = setInterval(fetchOrders, settings.refreshInterval)
      return () => clearInterval(interval)
    }
  }, [previousOrderCount, settings.autoRefresh, settings.refreshInterval])

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrders()
      }
    } catch (error) {
      console.error("Error updating order:", error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getTimeSince = (dateString: string) => {
    const now = new Date().getTime()
    const created = new Date(dateString).getTime()
    const diffMinutes = Math.floor((now - created) / 60000)

    if (diffMinutes < 1) return "Az önce"
    if (diffMinutes === 1) return "1 dakika önce"
    return `${diffMinutes} dakika önce`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Canlı Siparişler</h1>
          <p className="text-gray-600 mt-1">
            Otomatik yenileme: {settings.autoRefresh ? `${settings.refreshInterval / 1000} saniye` : "Kapalı"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {orders.length} Bekleyen Sipariş
          </Badge>
          <Button onClick={fetchOrders} variant="outline">
            Yenile
          </Button>
          <Button
            onClick={() => router.push("/customer/settings")}
            variant="outline"
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Bekleyen sipariş yok</p>
            <p className="text-sm text-gray-500 mt-2">
              Yeni siparişler geldiğinde burada görünecek
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status]
            return (
              <Card
                key={order.id}
                className="relative border-2 border-red-500 shadow-lg animate-pulse"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{order.customerName}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatTime(order.createdAt)} - {getTimeSince(order.createdAt)}
                      </p>
                      {order.customerPhone && (
                        <p className="text-sm text-gray-600 mt-1">
                          📞 {order.customerPhone}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[order.status]}>
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Sipariş Detayları */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Sipariş:</h4>
                    <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {order.items}
                    </p>
                  </div>

                  {/* Teslimat Adresi */}
                  {order.deliveryAddress && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Adres:</h4>
                      <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                    </div>
                  )}

                  {/* Notlar */}
                  {order.notes && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Notlar:</h4>
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  {/* Tutar */}
                  {order.totalAmount && (
                    <div className="pt-2 border-t">
                      <p className="text-lg font-bold">
                        Toplam: {order.totalAmount.toFixed(2)} TL
                      </p>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/customer/orders/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detay
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => updateOrderStatus(order.id, "PREPARING")}
                    >
                      <ChefHat className="h-4 w-4 mr-2" />
                      Hazırla
                    </Button>
                    <Button
                      className="col-span-2"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Tamamlandı
                    </Button>
                  </div>

                  {/* Transcript Link */}
                  {order.call.transcript && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        Görüşme Kaydı
                      </summary>
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        {order.call.transcript}
                      </p>
                    </details>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
