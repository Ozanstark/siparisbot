import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BotList from "@/components/bots/bot-list"
import AdminBotsHeader from "@/components/bots/admin-bots-header"

export const dynamic = "force-dynamic"

export default async function AdminBotsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const bots = await prisma.bot.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      _count: {
        select: { calls: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="p-8">
      <AdminBotsHeader />
      <BotList bots={bots} isAdmin={true} />
    </div>
  )
}
