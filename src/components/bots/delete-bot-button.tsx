"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DeleteBotButtonProps {
  botId: string
  botName: string
}

export default function DeleteBotButton({ botId, botName }: DeleteBotButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${botName}"? This action cannot be undone and will also delete the bot from Retell AI.`)) {
      return
    }

    if (!confirm(`FINAL WARNING: Deleting "${botName}" will permanently remove:\n- The bot from your dashboard\n- The bot from Retell AI\n- All call history\n- All assignments\n\nAre you absolutely sure?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete bot")
      }

      alert(`✅ Bot "${botName}" deleted successfully`)
      router.push("/admin/bots")
      router.refresh()
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? "Deleting..." : "Delete Bot"}
    </button>
  )
}
