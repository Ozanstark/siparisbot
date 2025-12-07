"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreateBotInput } from "@/lib/validations"
import AdvancedBotSettings from "./advanced-bot-settings"

const MODEL_OPTIONS = [
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5-nano", label: "GPT-5 Nano" },
  { value: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet" },
  { value: "claude-4.5-haiku", label: "Claude 4.5 Haiku" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gpt-4o", label: "GPT-4o (Legacy)" },
]

// Fallback voice options if API fails
const FALLBACK_VOICE_OPTIONS = [
  { value: "11labs-Adrian", label: "Adrian (Male)" },
  { value: "11labs-Emily", label: "Emily (Female)" },
  { value: "11labs-Josh", label: "Josh (Male)" },
  { value: "11labs-Aria", label: "Aria (Female)" },
]

interface BotFormProps {
  initialData?: Partial<CreateBotInput>
  botId?: string
  isAdmin?: boolean
}

interface Voice {
  voice_id: string
  voice_name: string
  provider?: string
  gender?: string
}

export default function BotForm({ initialData, botId, isAdmin }: BotFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic")

  const [formData, setFormData] = useState<CreateBotInput>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    voiceId: initialData?.voiceId || "11labs-Adrian",
    model: initialData?.model || "gpt-4.1",
    generalPrompt: initialData?.generalPrompt || "",
    beginMessage: initialData?.beginMessage || "",
  })

  // Load voices from API
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch("/api/voices")
        if (response.ok) {
          const data = await response.json()
          setVoices(data.voices || [])
        } else {
          console.error("Failed to load voices from API")
        }
      } catch (error) {
        console.error("Error loading voices:", error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    loadVoices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = botId ? `/api/bots/${botId}` : "/api/bots"
      const method = botId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save bot")
      }

      const redirectPath = isAdmin ? "/admin/bots" : "/customer/bots"
      router.push(redirectPath)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "basic"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Basic Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("advanced")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "advanced"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Advanced Settings
          </button>
        </nav>
      </div>

      {activeTab === "basic" && (
        <div className="space-y-6">
          <div>
        <label className="block text-sm font-medium mb-2">Bot Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Customer Support Bot"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Handles customer inquiries and support requests"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Voice {isLoadingVoices && <span className="text-xs text-gray-400">(Loading...)</span>}
          </label>
          <select
            value={formData.voiceId}
            onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoadingVoices}
          >
            {voices.length > 0 ? (
              voices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.voice_name} {voice.provider ? `(${voice.provider})` : ""} {voice.gender ? `- ${voice.gender}` : ""}
                </option>
              ))
            ) : (
              // Fallback if API fails
              FALLBACK_VOICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
          {voices.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {voices.length} voices available from Retell
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">General Prompt *</label>
        <textarea
          value={formData.generalPrompt}
          onChange={(e) => setFormData({ ...formData, generalPrompt: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="You are a helpful customer support assistant. You help customers with their inquiries and provide accurate information."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the system prompt that defines the bot's behavior
        </p>
      </div>

          <div>
            <label className="block text-sm font-medium mb-2">Begin Message</label>
            <input
              type="text"
              value={formData.beginMessage}
              onChange={(e) => setFormData({ ...formData, beginMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Hello! How can I help you today?"
            />
            <p className="text-xs text-gray-500 mt-1">
              The first message the bot will say when the call starts
            </p>
          </div>
        </div>
      )}

      {activeTab === "advanced" && (
        <AdvancedBotSettings formData={formData} setFormData={setFormData} />
      )}

      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Saving..." : botId ? "Update Bot" : "Create Bot"}
        </button>
      </div>
    </form>
  )
}
