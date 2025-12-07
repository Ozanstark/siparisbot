import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import BotList from "@/components/bots/bot-list"

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
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Bots</h1>
          <p className="text-gray-600 mt-1">Manage your assigned voice bots</p>
        </div>
      </div>

      <BotList bots={bots} isAdmin={false} />
    </div>
  )
}
