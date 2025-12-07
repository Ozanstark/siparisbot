import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import BotForm from "@/components/bots/bot-form"

export const dynamic = "force-dynamic"

export default async function EditBotPage({
  params,
}: {
  params: { botId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const bot = await prisma.bot.findFirst({
    where: {
      id: params.botId,
      organizationId: session.user.organizationId,
    }
  })

  if (!bot) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/admin/bots/${bot.id}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Bot Details
        </Link>
        <h1 className="text-3xl font-bold">Edit Bot</h1>
        <p className="text-gray-600 mt-1">Update {bot.name} configuration</p>
      </div>

      <BotForm
        initialData={{
          name: bot.name,
          description: bot.description || undefined,
          voiceId: bot.voiceId,
          model: bot.model,
          generalPrompt: bot.generalPrompt,
          beginMessage: bot.beginMessage || undefined,
        }}
        botId={bot.id}
        isAdmin={true}
      />
    </div>
  )
}
