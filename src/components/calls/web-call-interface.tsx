"use client"

import { useState, useEffect, useRef } from "react"

interface WebCallInterfaceProps {
  bots: Array<{ id: string; name: string }>
}

export default function WebCallInterface({ bots }: WebCallInterfaceProps) {
  const [selectedBotId, setSelectedBotId] = useState(bots[0]?.id || "")
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "connected" | "disconnected">("idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const retellWebClientRef = useRef<any>(null)

  // Load Retell Web SDK dynamically
  useEffect(() => {
    const loadRetellSDK = async () => {
      try {
        // Dynamically import Retell Web SDK
        const RetellWebClient = (await import("retell-client-js-sdk")).RetellWebClient
        retellWebClientRef.current = new RetellWebClient()

        // Setup event listeners
        retellWebClientRef.current.on("call_started", () => {
          console.log("Call started")
          setCallStatus("connected")
        })

        retellWebClientRef.current.on("call_ended", () => {
          console.log("Call ended")
          setCallStatus("disconnected")
        })

        retellWebClientRef.current.on("error", (error: Error) => {
          console.error("Call error:", error)
          setError(error.message)
          setCallStatus("idle")
        })

        retellWebClientRef.current.on("update", (update: any) => {
          console.log("Call update:", update)
        })
      } catch (err) {
        console.error("Failed to load Retell SDK:", err)
        setError("Failed to load Retell SDK. Please refresh the page.")
      }
    }

    loadRetellSDK()

    return () => {
      // Cleanup on unmount
      if (retellWebClientRef.current) {
        retellWebClientRef.current.stopCall()
      }
    }
  }, [])

  const startCall = async () => {
    if (!selectedBotId) {
      setError("Please select a bot")
      return
    }

    setCallStatus("connecting")
    setError(null)

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Stop after permission check

      // Create web call via API
      const response = await fetch("/api/calls/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: selectedBotId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create web call")
      }

      const data = await response.json()

      // Start call with Retell Web SDK
      await retellWebClientRef.current.startCall({
        accessToken: data.accessToken,
        sampleRate: data.sampleRate || 24000,
        captureDeviceId: undefined, // Use default microphone
        emitRawAudioSamples: false,
      })

      setCallStatus("connected")
    } catch (err: any) {
      console.error("Error starting call:", err)
      setError(err.message || "Failed to start call")
      setCallStatus("idle")
    }
  }

  const stopCall = () => {
    if (retellWebClientRef.current) {
      retellWebClientRef.current.stopCall()
      setCallStatus("disconnected")
    }
  }

  const toggleMute = () => {
    if (retellWebClientRef.current && callStatus === "connected") {
      if (isMuted) {
        retellWebClientRef.current.unmute()
      } else {
        retellWebClientRef.current.mute()
      }
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Web Call (Browser)</h3>
      <p className="text-sm text-gray-600 mb-6">
        Make a call directly from your browser using your microphone
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Bot</label>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            disabled={callStatus !== "idle"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="mb-4">
              <div
                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                  callStatus === "connected"
                    ? "bg-green-100 text-green-600"
                    : callStatus === "connecting"
                    ? "bg-yellow-100 text-yellow-600"
                    : callStatus === "disconnected"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {callStatus === "connected" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  )}
                </svg>
              </div>
            </div>

            <p className="text-lg font-semibold mb-2 capitalize">
              {callStatus === "idle" && "Ready to call"}
              {callStatus === "connecting" && "Connecting..."}
              {callStatus === "connected" && "Call in progress"}
              {callStatus === "disconnected" && "Call ended"}
            </p>

            <div className="flex gap-3 justify-center mt-6">
              {callStatus === "idle" && (
                <button
                  onClick={startCall}
                  className="px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
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
                  Start Call
                </button>
              )}

              {callStatus === "connecting" && (
                <button
                  disabled
                  className="px-8 py-3 bg-gray-400 text-white rounded-full font-medium"
                >
                  Connecting...
                </button>
              )}

              {callStatus === "connected" && (
                <>
                  <button
                    onClick={toggleMute}
                    className={`px-6 py-3 rounded-full font-medium transition-colors ${
                      isMuted
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={stopCall}
                    className="px-8 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    End Call
                  </button>
                </>
              )}

              {callStatus === "disconnected" && (
                <button
                  onClick={() => setCallStatus("idle")}
                  className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                >
                  Make Another Call
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
          <strong>Note:</strong> Your browser will request microphone permission when you start a
          call. Make sure to allow it.
        </div>
      </div>
    </div>
  )
}
