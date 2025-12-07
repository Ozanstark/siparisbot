"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ImportPhoneNumberInput } from "@/lib/validations"

interface ImportPhoneDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ImportPhoneDialog({ isOpen, onClose }: ImportPhoneDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bots, setBots] = useState<any[]>([])

  const [formData, setFormData] = useState<ImportPhoneNumberInput>({
    phoneNumber: "",
    agentId: undefined,
    nickname: undefined,
  })

  useEffect(() => {
    if (isOpen) {
      // Load bots for binding
      fetch("/api/bots")
        .then((res) => res.json())
        .then((data) => setBots(data.bots || []))
        .catch((err) => console.error("Failed to load bots:", err))
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/phone-numbers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to import phone number")
      }

      router.refresh()
      onClose()
      // Reset form
      setFormData({
        phoneNumber: "",
        agentId: undefined,
        nickname: undefined,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Import Phone Number</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number * (E.164 format)
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+14155551234"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +[country code][number] (e.g., +14155551234)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={formData.nickname || ""}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Main Support Line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bind to Bot (optional)
            </label>
            <select
              value={formData.agentId || ""}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No bot (configure later)</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This bot will handle inbound and outbound calls
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Importing..." : "Import Phone Number"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
