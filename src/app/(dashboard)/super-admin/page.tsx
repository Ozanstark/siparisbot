"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Users, Phone, Bot, TrendingUp, AlertTriangle } from "lucide-react"

interface OrganizationStats {
  id: string
  name: string
  slug: string
  subscriptionPlan: string
  monthlyCallMinutes: number
  maxMonthlyCallMinutes: number
  usagePercentage: number
  currentPeriodStart: string
  currentPeriodEnd: string | null
  userCount: number
  botCount: number
  phoneCount: number
  callCount: number
  activeCallCount: number
}

const planColors: Record<string, string> = {
  FREE: "bg-gray-500",
  BASIC: "bg-blue-500",
  PRO: "bg-purple-500",
  ENTERPRISE: "bg-orange-500"
}

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<OrganizationStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    totalBots: 0,
    totalCalls: 0,
    totalMinutes: 0
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/super-admin/organizations")
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations)
        setTotalStats(data.totals)
      }
    } catch (error) {
      console.error("Error fetching organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 75) return "text-orange-600"
    if (percentage >= 50) return "text-yellow-600"
    return "text-green-600"
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Süper Admin Paneli</h1>
        <p className="text-gray-600 mt-1">Tüm organizasyonlar ve kullanım istatistikleri</p>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizasyonlar</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalOrgs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalBots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Arama</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Dakika</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalMinutes.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organization List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Organizasyonlar</h2>
        {organizations.map((org) => (
          <Card key={org.id} className={org.usagePercentage >= 90 ? "border-red-500" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{org.name}</CardTitle>
                  <CardDescription>@{org.slug}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={planColors[org.subscriptionPlan]}>
                    {org.subscriptionPlan}
                  </Badge>
                  {org.usagePercentage >= 90 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Kota Doldu
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Kullanıcılar</p>
                  <p className="text-lg font-semibold">{org.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Botlar</p>
                  <p className="text-lg font-semibold">{org.botCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Telefon No.</p>
                  <p className="text-lg font-semibold">{org.phoneCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Toplam Arama</p>
                  <p className="text-lg font-semibold">{org.callCount}</p>
                </div>
              </div>

              {/* Quota Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Aylık Kota Kullanımı</p>
                  <p className={`text-sm font-semibold ${getUsageColor(org.usagePercentage)}`}>
                    {org.usagePercentage.toFixed(1)}%
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      org.usagePercentage >= 90
                        ? "bg-red-600"
                        : org.usagePercentage >= 75
                        ? "bg-orange-600"
                        : "bg-green-600"
                    }`}
                    style={{ width: `${Math.min(org.usagePercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {org.monthlyCallMinutes} / {org.maxMonthlyCallMinutes} dakika kullanıldı
                </p>
              </div>

              {/* Period Info */}
              <div className="mt-4 text-xs text-gray-500">
                <p>
                  Dönem: {new Date(org.currentPeriodStart).toLocaleDateString("tr-TR")} -{" "}
                  {org.currentPeriodEnd
                    ? new Date(org.currentPeriodEnd).toLocaleDateString("tr-TR")
                    : "Belirsiz"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Henüz organizasyon yok</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
