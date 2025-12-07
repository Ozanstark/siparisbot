"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface AddNumberDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ActionType = "purchase" | "import"

export default function AddNumberDialog({ isOpen, onClose }: AddNumberDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<ActionType>("purchase")
  const [bots, setBots] = useState<any[]>([])

  const [purchaseData, setPurchaseData] = useState({
    areaCode: "",
    agentId: "",
    nickname: ""
  })

  const [importData, setImportData] = useState({
    phoneNumber: "",
    agentId: "",
    nickname: ""
  })

  // Load bots for binding
  useEffect(() => {
    if (isOpen) {
      fetch("/api/bots")
        .then(res => res.json())
        .then(data => setBots(data.bots || []))
        .catch(err => console.error("Error loading bots:", err))
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const body = action === "purchase" ? purchaseData : importData
      const response = await fetch(`/api/phone-numbers?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.details || "Failed to add number")
      }

      router.refresh()
      onClose()
      // Reset forms
      setPurchaseData({ areaCode: "", agentId: "", nickname: "" })
      setImportData({ phoneNumber: "", agentId: "", nickname: "" })
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
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Add Phone Number</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Action Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setAction("purchase")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${action === "purchase"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Purchase from Retell
          </button>
          <button
            type="button"
            onClick={() => setAction("import")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${action === "import"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Import Existing
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === "purchase" ? (
            <>
              {/* Purchase Form */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Area Code (Optional)
                </label>
                <input
                  type="text"
                  value={purchaseData.areaCode}
                  onChange={(e) => setPurchaseData({ ...purchaseData, areaCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="415"
                  maxLength={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  US area code (3 digits). Leave empty for random number.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Import Form */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number * (E.164 format)
                </label>
                <input
                  type="tel"
                  value={importData.phoneNumber}
                  onChange={(e) => setImportData({ ...importData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+14155551234"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your existing phone number from Twilio, Telnyx, etc.
                </p>
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Bind to Bot (Optional)
            </label>
            <select
              value={action === "purchase" ? purchaseData.agentId : importData.agentId}
              onChange={(e) => {
                if (action === "purchase") {
                  setPurchaseData({ ...purchaseData, agentId: e.target.value })
                } else {
                  setImportData({ ...importData, agentId: e.target.value })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No binding (outbound only)</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Bind to a bot to handle inbound calls
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nickname (Optional)
            </label>
            <input
              type="text"
              value={action === "purchase" ? purchaseData.nickname : importData.nickname}
              onChange={(e) => {
                if (action === "purchase") {
                  setPurchaseData({ ...purchaseData, nickname: e.target.value })
                } else {
                  setImportData({ ...importData, nickname: e.target.value })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Main Line"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? (action === "purchase" ? "Purchasing..." : "Importing...")
                : (action === "purchase" ? "Purchase Number" : "Import Number")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
