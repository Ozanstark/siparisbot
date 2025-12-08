"use client"

import { useState, useEffect } from "react"

export const dynamic = "force-dynamic"

export default function RetellDebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)

  useEffect(() => {
    fetchDebugData()
  }, [])

  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/retell-calls")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fixWebhooks = async () => {
    setFixing(true)
    setFixResult(null)
    try {
      const response = await fetch("/api/admin/bots/fix-webhooks", { method: "POST" })
      const result = await response.json()
      setFixResult(result)
      if (result.success) {
        // Refresh data after fixing
        setTimeout(() => fetchDebugData(), 2000)
      }
    } catch (err: any) {
      setFixResult({ success: false, error: err.message })
    } finally {
      setFixing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Retell API Debug</h1>
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Retell API Debug</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Hata: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🔧 Retell API Debug</h1>
        <div className="flex gap-2">
          <button
            onClick={fixWebhooks}
            disabled={fixing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fixing ? "⏳ Düzeltiliyor..." : "🔧 Webhook'ları Düzelt"}
          </button>
          <button
            onClick={fetchDebugData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      {/* Fix Result Alert */}
      {fixResult && (
        <div className={`mb-6 p-4 rounded border ${
          fixResult.success
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className="font-bold mb-2">
            {fixResult.success ? "✅ Başarılı!" : "❌ Hata"}
          </div>
          <div className="text-sm">
            {fixResult.message || fixResult.error}
          </div>
          {fixResult.webhookUrl && (
            <div className="text-xs mt-2 font-mono bg-white/50 p-2 rounded">
              Webhook URL: {fixResult.webhookUrl}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Organization Info */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📋 Organization</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Retell API Key:</span>
              <span className={data?.organization?.hasApiKey ? "text-green-600" : "text-red-600"}>
                {data?.organization?.hasApiKey ? "✅ Var" : "❌ Yok"}
              </span>
            </div>
          </div>
        </div>

        {/* Retell API */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🔌 Retell API</h2>
          {data?.retell?.apiWorking ? (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded">
              ✅ Bağlantı OK! Çağrı sayısı: {data?.retell?.callsCount}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
              ❌ Hata: {data?.retell?.error}
            </div>
          )}
        </div>

        {/* Database */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">💾 Database Çağrılar: {data?.database?.callsCount}</h2>
          {data?.database?.calls?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Bot</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {data.database.calls.map((call: any) => (
                    <tr key={call.id} className="border-t">
                      <td className="p-2">{call.bot?.name}</td>
                      <td className="p-2">{call.status}</td>
                      <td className="p-2">{new Date(call.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Henüz çağrı yok</p>
          )}
        </div>

        {/* Phone Numbers */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📞 Telefon Numaraları: {data?.phoneNumbers?.count}</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Bot'a Atanmış:</span>
              <span className={`font-bold ${data?.phoneNumbers?.assigned === data?.phoneNumbers?.count && data?.phoneNumbers?.count > 0 ? "text-green-600" : "text-yellow-600"}`}>
                {data?.phoneNumbers?.assigned} / {data?.phoneNumbers?.count}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Aktif:</span>
              <span className="font-bold">{data?.phoneNumbers?.active} / {data?.phoneNumbers?.count}</span>
            </div>
          </div>
          {data?.phoneNumbers?.list && data.phoneNumbers.list.length > 0 ? (
            <div className="space-y-2">
              {data.phoneNumbers.list.map((phone: any) => (
                <div key={phone.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{phone.number}</div>
                      {phone.nickname && <div className="text-xs text-gray-600">{phone.nickname}</div>}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${phone.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {phone.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  {phone.inboundAgent ? (
                    <div className="text-xs text-green-600 mt-1">✅ Bot: {phone.inboundAgent.name}</div>
                  ) : (
                    <div className="text-xs text-red-600 mt-1">❌ Bot atanmamış</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
              ⚠️ Hiç telefon numarası yok! Admin → Telefon Numaraları'ndan ekleyin.
            </div>
          )}
        </div>

        {/* Bots */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🤖 Botlar: {data?.bots?.count}</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Webhook URL'li:</span>
              <span className="font-bold">{data?.bots?.withWebhook} / {data?.bots?.count}</span>
            </div>
            <div className="flex justify-between">
              <span>Telefon Numaralı:</span>
              <span className={`font-bold ${data?.bots?.withPhoneNumber > 0 ? "text-green-600" : "text-yellow-600"}`}>
                {data?.bots?.withPhoneNumber} / {data?.bots?.count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
