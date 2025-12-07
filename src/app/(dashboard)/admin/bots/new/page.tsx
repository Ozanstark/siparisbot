import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import BotForm from "@/components/bots/bot-form"

export default async function NewBotPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/bots"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Bots
        </Link>
        <h1 className="text-3xl font-bold">Create New Bot</h1>
        <p className="text-gray-600 mt-1">
          Configure a new voice bot with Retell AI
        </p>
      </div>

      <BotForm isAdmin={true} />
    </div>
  )
}
