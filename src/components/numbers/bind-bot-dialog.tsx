"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface BindBotDialogProps {
  isOpen: boolean
  onClose: () => void
  numberId: string | null
  currentInboundBotId?: string | null
  currentOutboundBotId?: string | null
}

export default function BindBotDialog({ isOpen, onClose, numberId, currentInboundBotId, currentOutboundBotId }: BindBotDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bots, setBots] = useState<any[]>([])
  const [selectedInboundBotId, setSelectedInboundBotId] = useState<string>("")
  const [selectedOutboundBotId, setSelectedOutboundBotId] = useState<string>("")

  useEffect(() => {
    if (isOpen) {
      // Load bots
      fetch("/api/bots")
        .then(res => res.json())
        .then(data => {
          setBots(data.bots || [])
          setSelectedInboundBotId(currentInboundBotId || "")
          setSelectedOutboundBotId(currentOutboundBotId || "")
        })
        .catch(err => console.error("Error loading bots:", err))
    }
  }, [isOpen, currentInboundBotId, currentOutboundBotId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numberId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/phone-numbers/${numberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboundAgentId: selectedInboundBotId || null,
          outboundAgentId: selectedOutboundBotId || null
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to bind bots")
      }

      router.refresh()
      onClose()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Asistanları Numaraya Bağla</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Gelen Arama Asistanı (Inbound)
            </label>
            <select
              value={selectedInboundBotId}
              onChange={(e) => setSelectedInboundBotId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Asistan atanmadı</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name} {bot.isActive ? "" : "(Pasif)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Bu numaraya gelen çağrıları karşılayacak asistan
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Giden Arama Asistanı (Outbound)
            </label>
            <select
              value={selectedOutboundBotId}
              onChange={(e) => setSelectedOutboundBotId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Asistan atanmadı</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name} {bot.isActive ? "" : "(Pasif)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Bu numaradan arama yaparken kullanılacak asistan
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Güncelleniyor..." : "Güncelle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
