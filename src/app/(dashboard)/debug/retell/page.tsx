"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function RetellDebugPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const checkConnection = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch("/api/debug/retell-calls")
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch")
            }

            setResult(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Retell API Connection Debugger</h1>
                <Button onClick={checkConnection} disabled={loading}>
                    {loading ? "Checking..." : "Test Connection"}
                </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
                <h2 className="font-semibold mb-2">Instructions</h2>
                <p className="text-sm text-muted-foreground">
                    Click the button above to attempt fetching the call history directly from Retell API using the server-side API Key.
                    This verifies if the Vercel environment is correctly configured to talk to Retell.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                    <h3 className="font-bold">Connection Failed</h3>
                    <p className="font-mono text-sm mt-2">{error}</p>
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="text-sm font-medium text-muted-foreground">API Key Status</div>
                            <div className={`text-lg font-bold ${result.env_check.RETELL_API_KEY_CONFIGURED ? "text-green-500" : "text-red-500"}`}>
                                {result.env_check.RETELL_API_KEY_CONFIGURED ? "Configured" : "Missing"}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                Preview: {result.env_check.KEY_PREVIEW}
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="text-sm font-medium text-muted-foreground">API Response</div>
                            <div className="text-lg font-bold">
                                {result.status === "success" ? "OK" : "Error"}
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 text-sm font-medium">Raw Response Data</div>
                        <pre className="p-4 bg-black/90 text-white text-xs overflow-auto max-h-[500px]">
                            {JSON.stringify(result.data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
