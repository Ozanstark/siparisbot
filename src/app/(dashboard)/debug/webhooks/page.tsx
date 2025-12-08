"use client"

import { useState, useEffect } from "react"

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/webhook-logs")
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔔 Webhook Logs</h1>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Yenile
        </button>
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : logs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
          Henüz webhook log yok
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg p-6 ${
                log.processed
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {log.processed ? "✅" : "❌"} {log.eventType}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                {log.callId && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Call ID: {log.callId.slice(0, 8)}...
                  </span>
                )}
              </div>

              {log.error && (
                <div className="mb-4 bg-red-100 border border-red-300 text-red-800 p-3 rounded">
                  <strong>Error:</strong> {log.error}
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                  Payload'u Göster
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
