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
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Merhaba, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{session.user.name?.split(' ')[0] || 'Misafir'}</span> 👋
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Sesli asistanlarınızı ve görüşmelerinizi buradan yönetebilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full border shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Sistem Aktif
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Asistanlar</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBotsCount} / {bots.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              kullanıma hazır asistan
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atanan Numaralar</CardTitle>
            <Phone className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedNumbersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              aktif telefon numarası
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Görüşme</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              gerçekleşen arama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Helpful Alert */}
      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 font-semibold">İpucu</AlertTitle>
        <AlertDescription className="text-blue-700">
          Asistanlarınızın performansını artırmak için görüşme kayıtlarını düzenli olarak incelemeyi ve "Analiz" raporlarına göz atmayı unutmayın.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">Asistan Listesi</h2>
        </div>
        <BotList bots={bots} isAdmin={false} />
      </div>
    </div>
  )
}
