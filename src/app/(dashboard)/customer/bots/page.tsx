import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BotList from "@/components/bots/bot-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Phone, MessageSquare, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const dynamic = "force-dynamic"

export default async function CustomerBotsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "CUSTOMER") {
    redirect("/login")
  }

  const bots = await prisma.bot.findMany({
    where: {
      organizationId: session.user.organizationId,
      assignments: {
        some: { userId: session.user.id }
      }
    },
    include: {
      _count: {
        select: { calls: true }
      },
      inboundPhones: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Calculate Stats
  const activeBotsCount = bots.filter(b => b.isActive).length
  const totalCalls = bots.reduce((acc, bot) => acc + (bot._count?.calls || 0), 0)
  const assignedNumbersCount = bots.reduce((acc, bot) => acc + (bot.inboundPhones?.length || 0), 0)

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Merhaba, <span className="text-gradient">{session.user.name?.split(' ')[0] || 'Misafir'}</span> 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">
            Yapay zeka asistanlarınız iş başında.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 px-5 py-2.5 rounded-full border border-green-100 dark:border-green-800 shadow-sm backdrop-blur-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Sistem Online
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-24 w-24 text-blue-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Asistanlar</CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">{activeBotsCount} <span className="text-lg text-gray-400 font-normal">/ {bots.length}</span></div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              +7/24 hizmete hazır
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Phone className="h-24 w-24 text-indigo-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atanan Numaralar</CardTitle>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <Phone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">{assignedNumbersCount}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              küresel erişim noktası
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageSquare className="h-24 w-24 text-green-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Görüşme</CardTitle>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              başarıyla tamamlandı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modern Tip Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-white dark:bg-black/20 rounded-2xl shadow-sm text-blue-600 dark:text-blue-400">
          <Info className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            Pro İpucu
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mt-1 leading-relaxed">
            Asistan verimliliğini %30 artırmak için "Analiz" sekmesindeki konuşma sürelerini inceleyin. Kısa süren görüşmeler genellikle selamlama metninin iyileştirilmesi gerektiğine işarettir.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-1.5 h-8 bg-primary rounded-full"></span>
            Asistan Listesi
          </h2>
        </div>
        <BotList bots={bots} isAdmin={false} />
      </div>
    </div>
  )
}
