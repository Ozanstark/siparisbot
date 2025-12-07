"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface InitiateCallDialogProps {
  isOpen: boolean
  onClose: () => void
  bots: Array<{ id: string; name: string }>
  phoneNumbers?: Array<{ id: string; number: string; nickname?: string | null }>
}

interface Voice {
  voice_id: string
  voice_name: string
  provider?: string
}

export default function InitiateCallDialog({
  isOpen,
  onClose,
  bots,
  phoneNumbers = []
}: InitiateCallDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])

  const [formData, setFormData] = useState({
    botId: bots[0]?.id || "",
    fromNumberId: "",
    toNumber: "",
    overrides: {
      voiceId: "",
      voiceTemperature: "",
      voiceSpeed: "",
      responsiveness: "",
      interruptionSensitivity: "",
      generalPrompt: "",
      beginMessage: "",
      model: "",
      temperature: "",
      maxDuration: ""
    }
  })

  // Load voices for override options
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch("/api/voices")
        if (response.ok) {
          const data = await response.json()
          setVoices(data.voices || [])
        }
      } catch (error) {
        console.error("Error loading voices:", error)
      }
    }
    if (isOpen) {
      loadVoices()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Build payload with only non-empty override values
      const payload: any = {
        botId: formData.botId,
        toNumber: formData.toNumber,
        ...(formData.fromNumberId && { fromNumberId: formData.fromNumberId })
      }

      // Add overrides if any are set
      const overrides: any = {}
      if (formData.overrides.voiceId) overrides.voiceId = formData.overrides.voiceId
      if (formData.overrides.voiceTemperature) overrides.voiceTemperature = parseFloat(formData.overrides.voiceTemperature)
      if (formData.overrides.voiceSpeed) overrides.voiceSpeed = parseFloat(formData.overrides.voiceSpeed)
      if (formData.overrides.responsiveness) overrides.responsiveness = parseFloat(formData.overrides.responsiveness)
      if (formData.overrides.interruptionSensitivity) overrides.interruptionSensitivity = parseFloat(formData.overrides.interruptionSensitivity)
      if (formData.overrides.generalPrompt) overrides.generalPrompt = formData.overrides.generalPrompt
      if (formData.overrides.beginMessage) overrides.beginMessage = formData.overrides.beginMessage
      if (formData.overrides.model) overrides.model = formData.overrides.model
      if (formData.overrides.temperature) overrides.temperature = parseFloat(formData.overrides.temperature)
      if (formData.overrides.maxDuration) overrides.maxDuration = parseInt(formData.overrides.maxDuration)

      if (Object.keys(overrides).length > 0) {
        payload.overrides = overrides
      }

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to initiate call")
      }

      router.refresh()
      onClose()
      setFormData({
        botId: bots[0]?.id || "",
        fromNumberId: "",
        toNumber: "",
        overrides: {
          voiceId: "",
          voiceTemperature: "",
          voiceSpeed: "",
          responsiveness: "",
          interruptionSensitivity: "",
          generalPrompt: "",
          beginMessage: "",
          model: "",
          temperature: "",
          maxDuration: ""
        }
      })
      setShowAdvanced(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold mb-4">Initiate Call</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bot *</label>
            <select
              value={formData.botId}
              onChange={(e) => setFormData({ ...formData, botId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>

          {phoneNumbers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">From Number (Optional)</label>
              <select
                value={formData.fromNumberId}
                onChange={(e) => setFormData({ ...formData, fromNumberId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Use default</option>
                {phoneNumbers.map((num) => (
                  <option key={num.id} value={num.id}>
                    {num.nickname || num.number}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">To Number * (E.164 format)</label>
            <input
              type="tel"
              value={formData.toNumber}
              onChange={(e) => setFormData({ ...formData, toNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+14155551234"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US)
            </p>
          </div>

          {/* Advanced Options Accordion */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-medium hover:bg-gray-50 transition-colors"
            >
              <span>Advanced Options (Override Agent Settings)</span>
              <span className="text-xl">{showAdvanced ? "−" : "+"}</span>
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4 border-t">
                <p className="text-xs text-gray-500 mt-3">
                  Override bot settings for this call only. Leave empty to use bot defaults.
                </p>

                {/* Voice Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Voice Settings</h4>

                  <div>
                    <label className="block text-xs font-medium mb-1">Voice</label>
                    <select
                      value={formData.overrides.voiceId}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, voiceId: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Use bot default</option>
                      {voices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.voice_name} {voice.provider ? `(${voice.provider})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Voice Temperature (0-2)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={formData.overrides.voiceTemperature}
                        onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, voiceTemperature: e.target.value } })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Voice Speed (0.5-2)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="2"
                        value={formData.overrides.voiceSpeed}
                        onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, voiceSpeed: e.target.value } })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Responsiveness (0-1)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={formData.overrides.responsiveness}
                        onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, responsiveness: e.target.value } })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Interruption Sensitivity (0-1)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={formData.overrides.interruptionSensitivity}
                        onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, interruptionSensitivity: e.target.value } })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default"
                      />
                    </div>
                  </div>
                </div>

                {/* LLM Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">LLM Settings</h4>

                  <div>
                    <label className="block text-xs font-medium mb-1">Model</label>
                    <select
                      value={formData.overrides.model}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, model: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Use bot default</option>
                      <option value="gpt-4o">GPT-4 Optimized</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Temperature (0-2)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.overrides.temperature}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, temperature: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Default"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Custom Prompt</label>
                    <textarea
                      value={formData.overrides.generalPrompt}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, generalPrompt: e.target.value } })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Use bot default prompt"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Custom Begin Message</label>
                    <input
                      type="text"
                      value={formData.overrides.beginMessage}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, beginMessage: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Use bot default"
                    />
                  </div>
                </div>

                {/* Call Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Call Settings</h4>

                  <div>
                    <label className="block text-xs font-medium mb-1">Max Duration (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.overrides.maxDuration}
                      onChange={(e) => setFormData({ ...formData, overrides: { ...formData.overrides, maxDuration: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
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
              {isLoading ? "Initiating..." : "Initiate Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
