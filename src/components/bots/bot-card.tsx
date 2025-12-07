"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bot } from "@prisma/client"

interface BotCardProps {
  bot: Bot & {
    _count?: { calls: number }
    assignments?: Array<{
      user: {
        id: string
        name: string | null
        email: string
      }
    }>
  }
  isAdmin?: boolean
}

export default function BotCard({ bot, isAdmin }: BotCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!confirm(`Are you sure you want to delete "${bot.name}"? This will also delete it from Retell AI.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete bot")
      }

      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
      setIsDeleting(false)
    }
  }
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{bot.name}</h3>
          {bot.description && (
            <p className="text-sm text-gray-600 mt-1">{bot.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs rounded ${
            bot.isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {bot.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Voice:</span>
          <span className="font-medium">{bot.voiceId}</span>
        </div>
        <div className="flex justify-between">
          <span>Model:</span>
          <span className="font-medium">{bot.model}</span>
        </div>
        {bot._count && (
          <div className="flex justify-between">
            <span>Total Calls:</span>
            <span className="font-medium">{bot._count.calls}</span>
          </div>
        )}
        {isAdmin && bot.assignments && (
          <div className="flex justify-between">
            <span>Assigned To:</span>
            <span className="font-medium">{bot.assignments.length} customers</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href={isAdmin ? `/admin/bots/${bot.id}` : `/customer/bots/${bot.id}`}
          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          View Details
        </Link>
        <Link
          href={isAdmin ? `/admin/bots/${bot.id}/edit` : `/customer/bots/${bot.id}/edit`}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Delete bot"
          >
            {isDeleting ? "..." : "🗑️"}
          </button>
        )}
      </div>
    </div>
  )
}
