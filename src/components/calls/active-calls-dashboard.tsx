"use client"

import { useState, useEffect } from "react"
import { formatDuration } from "@/lib/utils"

interface ActiveCall {
  id: string
  retellCallId: string
  status: string
  toNumber: string
  fromNumber?: string | null
  currentDuration: number | null
  createdAt: string
  startedAt?: string | null
  bot: {
    id: string
    name: string
  }
  initiatedBy: {
    id: string
    name: string
    email: string
  }
}

export default function ActiveCallsDashboard() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch("/api/calls/active")
      if (response.ok) {
        const data = await response.json()
        setActiveCalls(data.activeCalls || [])
        setError(null)
      } else {
        throw new Error("Failed to fetch active calls")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveCalls()

    // Auto-refresh every 3 seconds if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchActiveCalls, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      INITIATED: { bg: "bg-yellow-100", text: "text-yellow-800" },
      IN_PROGRESS: { bg: "bg-green-100", text: "text-green-800" },
    }

    const style = statusMap[status] || { bg: "bg-gray-100", text: "text-gray-800" }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status.replace("_", " ")}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading active calls...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Active Calls</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time monitoring of ongoing calls
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-refresh (3s)
            </label>
          </div>
          <button
            onClick={fetchActiveCalls}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {activeCalls.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <p className="text-gray-500 text-lg font-medium">No active calls</p>
          <p className="text-gray-400 text-sm mt-1">
            Active calls will appear here when initiated
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCalls.map((call) => (
            <div
              key={call.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{call.bot.name}</h3>
                    {getStatusBadge(call.status)}
                    {call.status === "IN_PROGRESS" && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                        Live
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">To:</span>
                      <span className="ml-2 font-mono">{call.toNumber}</span>
                    </div>
                    {call.fromNumber && (
                      <div>
                        <span className="text-gray-500">From:</span>
                        <span className="ml-2 font-mono">{call.fromNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Initiated by:</span>
                      <span className="ml-2">{call.initiatedBy.name}</span>
                    </div>
                    {call.currentDuration !== null && (
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">
                          {formatDuration(call.currentDuration * 1000)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>Call ID:</div>
                  <div className="font-mono">{call.retellCallId.slice(0, 12)}...</div>
                </div>
              </div>

              {call.status === "INITIATED" && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded mt-3">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connecting...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Total active calls: <span className="font-semibold">{activeCalls.length}</span>
          </span>
          <span className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}
