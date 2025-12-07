"use client"

import { useState } from "react"

interface BatchCallUploadProps {
  bots: Array<{ id: string; name: string }>
}

interface CallResult {
  index: number
  toNumber: string
  callId?: string
  success: boolean
  error?: string
}

export default function BatchCallUpload({ bots }: BatchCallUploadProps) {
  const [selectedBotId, setSelectedBotId] = useState(bots[0]?.id || "")
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{
    total: number
    successful: number
    failed: number
    results: CallResult[]
    errors: CallResult[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResults(null)
      setError(null)
    }
  }

  const parseCSV = (text: string): Array<{ toNumber: string; fromNumber?: string }> => {
    const lines = text.trim().split('\n')
    const calls = []

    // Skip header if exists
    const startIndex = lines[0].toLowerCase().includes('number') || lines[0].toLowerCase().includes('phone') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim())

      if (parts.length >= 1) {
        const callData: { toNumber: string; fromNumber?: string } = {
          toNumber: parts[0]
        }

        if (parts.length >= 2 && parts[1]) {
          callData.fromNumber = parts[1]
        }

        calls.push(callData)
      }
    }

    return calls
  }

  const handleUpload = async () => {
    if (!file || !selectedBotId) {
      setError("Please select a bot and upload a CSV file")
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults(null)

    try {
      // Read CSV file
      const text = await file.text()
      const calls = parseCSV(text)

      if (calls.length === 0) {
        throw new Error("No valid phone numbers found in CSV")
      }

      // Send batch request
      const response = await fetch("/api/calls/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: selectedBotId,
          calls
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process batch calls")
      }

      const data = await response.json()
      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = "toNumber,fromNumber\n+14155551234,+14155559999\n+14155555678,+14155559999"
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch_calls_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Batch Call Upload</h3>
      <p className="text-sm text-gray-600 mb-6">
        Upload a CSV file with phone numbers to initiate multiple calls at once
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select Bot</label>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            CSV format: toNumber,fromNumber (one call per line)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || !selectedBotId || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Start Batch Calls"}
          </button>
          <button
            onClick={downloadTemplate}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
          >
            Download Template
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Batch Results</h4>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{results.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Successful</p>
              <p className="text-2xl font-bold text-green-600">{results.successful}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{results.failed}</p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-red-600 mb-2">Failed Calls:</h5>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {results.errors.map((err, idx) => (
                  <div key={idx} className="text-sm mb-2">
                    <span className="font-mono">{err.toNumber}</span>
                    <span className="text-red-600 ml-2">- {err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.results.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-green-600 mb-2">Successful Calls:</h5>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {results.results.map((result, idx) => (
                  <div key={idx} className="text-sm mb-1">
                    <span className="font-mono">{result.toNumber}</span>
                    <span className="text-green-600 ml-2">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-blue-800 mb-2">CSV Format:</h5>
        <pre className="text-xs font-mono bg-white p-3 rounded border">
{`toNumber,fromNumber
+14155551234,+14155559999
+14155555678,+14155559999
+14155556789,`}
        </pre>
        <p className="text-xs text-blue-600 mt-2">
          • First column: Destination number (E.164 format, required)
          <br />
          • Second column: Caller ID number (optional)
          <br />• Header row is optional
        </p>
      </div>
    </div>
  )
}
