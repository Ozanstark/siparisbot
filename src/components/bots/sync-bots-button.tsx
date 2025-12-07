"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

export default function SyncBotsButton({ onSuccess }: { onSuccess: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (!confirm("This will import all bots from Retell AI. Continue?")) {
      return
    }

    setIsSyncing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/bots/sync", {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to sync bots")
      }

      setResult(data.results)
      alert(`✅ ${data.message}\n\n` +
        `Created: ${data.results.created}\n` +
        `Updated: ${data.results.updated}\n` +
        `Skipped: ${data.results.skipped}` +
        (data.results.errors.length > 0 ? `\n\nErrors:\n${data.results.errors.join('\n')}` : '')
      )

      // Refresh the page to show new bots
      onSuccess()
    } catch (err: any) {
      console.error("Sync error:", err)
      setError(err.message)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Import bots from Retell AI"
    >
      <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Syncing..." : "Sync from Retell"}
    </button>
  )
}
