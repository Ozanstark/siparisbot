"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import SyncBotsButton from "./sync-bots-button"

export default function AdminBotsHeader() {
  const router = useRouter()

  const handleSyncSuccess = () => {
    router.refresh()
  }

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Bots</h1>
        <p className="text-gray-600 mt-1">Manage your voice bots</p>
      </div>
      <div className="flex gap-3">
        <SyncBotsButton onSuccess={handleSyncSuccess} />
        <Link
          href="/admin/bots/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Create Bot
        </Link>
      </div>
    </div>
  )
}
