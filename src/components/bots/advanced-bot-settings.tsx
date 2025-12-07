"use client"

import { CreateBotInput } from "@/lib/validations"

interface AdvancedBotSettingsProps {
  formData: Partial<CreateBotInput>
  setFormData: (data: Partial<CreateBotInput>) => void
}

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-IN", label: "English (India)" },
  { value: "tr-TR", label: "Türkçe (Turkish)" },
  { value: "es-ES", label: "Español (Spanish)" },
  { value: "es-419", label: "Español (Latin America)" },
  { value: "de-DE", label: "Deutsch (German)" },
  { value: "fr-FR", label: "Français (French)" },
  { value: "it-IT", label: "Italiano (Italian)" },
  { value: "pt-PT", label: "Português (Portuguese)" },
  { value: "pt-BR", label: "Português (Brazil)" },
  { value: "hi-IN", label: "हिन्दी (Hindi)" },
  { value: "ja-JP", label: "日本語 (Japanese)" },
  { value: "ko-KR", label: "한국어 (Korean)" },
  { value: "zh-CN", label: "中文 (Chinese)" },
]

const AMBIENT_SOUND_OPTIONS = [
  { value: "", label: "None" },
  { value: "coffee-shop", label: "Coffee Shop" },
  { value: "convention-hall", label: "Convention Hall" },
  { value: "summer-outdoor", label: "Summer Outdoor" },
  { value: "mountain-outdoor", label: "Mountain Outdoor" },
  { value: "static-noise", label: "Static Noise" },
]

export default function AdvancedBotSettings({ formData, setFormData }: AdvancedBotSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <select
          value={formData.language || "en-US"}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          The language for speech recognition and synthesis
        </p>
      </div>

      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium mb-2">Webhook URL (Optional)</label>
        <input
          type="url"
          value={formData.webhookUrl || ""}
          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://your-server.com/webhook"
        />
        <p className="text-xs text-gray-500 mt-1">
          Custom webhook endpoint for call events
        </p>
      </div>

      {/* Voice Settings */}
      <div className="border-t pt-4">
        <h3 className="text-md font-semibold mb-4">Voice Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Voice Temperature (0-2)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={formData.voiceTemperature ?? 1}
              onChange={(e) => setFormData({ ...formData, voiceTemperature: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Controls voice variation. Higher = more expressive
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Voice Speed (0.5-2)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="2"
              value={formData.voiceSpeed ?? 1}
              onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Controls speech speed. 1 = normal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Responsiveness (0-1)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.responsiveness ?? 1}
              onChange={(e) => setFormData({ ...formData, responsiveness: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How quickly bot responds. Higher = faster
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Interruption Sensitivity (0-1)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.interruptionSensitivity ?? 1}
              onChange={(e) => setFormData({ ...formData, interruptionSensitivity: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How easily user can interrupt bot
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Ambient Sound</label>
          <select
            value={formData.ambientSound || ""}
            onChange={(e) => setFormData({ ...formData, ambientSound: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AMBIENT_SOUND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Background sound to mask synthesis artifacts
          </p>
        </div>

        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="enableBackchannel"
            checked={formData.enableBackchannel || false}
            onChange={(e) => setFormData({ ...formData, enableBackchannel: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enableBackchannel" className="ml-2 text-sm">
            Enable Backchannel ("mm-hmm", "yeah" responses)
          </label>
        </div>
      </div>

      {/* Call Settings */}
      <div className="border-t pt-4">
        <h3 className="text-md font-semibold mb-4">Call Settings</h3>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="normalizeForSpeech"
              checked={formData.normalizeForSpeech ?? true}
              onChange={(e) => setFormData({ ...formData, normalizeForSpeech: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="normalizeForSpeech" className="ml-2 text-sm">
              Normalize for Speech (convert numbers/dates to words)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="optOutSensitiveData"
              checked={formData.optOutSensitiveDataStorage || false}
              onChange={(e) => setFormData({ ...formData, optOutSensitiveDataStorage: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="optOutSensitiveData" className="ml-2 text-sm">
              Opt-out Sensitive Data Storage (PII scrubbing)
            </label>
          </div>
        </div>
      </div>

      {/* Boosted Keywords */}
      <div className="border-t pt-4">
        <h3 className="text-md font-semibold mb-2">Boosted Keywords</h3>
        <p className="text-xs text-gray-500 mb-3">
          Keywords to improve recognition accuracy (comma-separated)
        </p>
        <input
          type="text"
          value={(formData.boostedKeywords || []).join(", ")}
          onChange={(e) => {
            const keywords = e.target.value.split(",").map(k => k.trim()).filter(k => k)
            setFormData({ ...formData, boostedKeywords: keywords })
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="restaurant, menu, reservation, booking"
        />
      </div>
    </div>
  )
}
