"use client"

import { useState, useEffect } from "react"
import { Wrench, Plus, Trash2, Code, ExternalLink } from "lucide-react"

interface CustomTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, any>
      required?: string[]
    }
    async?: boolean
    speak_during_execution?: boolean
    speak_after_execution?: boolean
    url?: string
  }
}

interface ToolManagementSectionProps {
  botId: string
}

export default function ToolManagementSection({ botId }: ToolManagementSectionProps) {
  const [tools, setTools] = useState<CustomTool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null)

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/tools`)
      if (response.ok) {
        const data = await response.json()
        setTools(data.customTools || [])
      }
    } catch (err) {
      console.error("Failed to load tools:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (toolName: string) => {
    if (!confirm(`Delete tool "${toolName}"?`)) return

    try {
      const updatedTools = tools.filter(t => t.function.name !== toolName)
      const response = await fetch(`/api/bots/${botId}/tools`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTools: updatedTools })
      })

      if (response.ok) {
        setTools(updatedTools)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete tool")
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (isLoading) {
    return <div className="text-gray-500">Loading tools...</div>
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Custom Tools / Functions
        </h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
        >
          <Plus size={16} />
          Add Tool
        </button>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Wrench className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p>No custom tools defined</p>
          <p className="text-sm mt-1">Add tools to extend your agent's capabilities</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-semibold text-orange-600">
                      {tool.function.name}()
                    </h3>
                    {tool.function.url && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        <ExternalLink size={12} />
                        Webhook
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{tool.function.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingTool(tool)
                      setShowAddDialog(true)
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Code size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(tool.function.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Parameters:</span>
                  <span className="ml-2 font-medium">
                    {Object.keys(tool.function.parameters.properties || {}).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Required:</span>
                  <span className="ml-2 font-medium">
                    {tool.function.parameters.required?.length || 0}
                  </span>
                </div>
                {tool.function.async && (
                  <div className="col-span-2">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                      Async
                    </span>
                  </div>
                )}
              </div>

              {tool.function.url && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-500">Webhook URL:</span>
                  <p className="font-mono text-blue-600 mt-1 break-all">{tool.function.url}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <ToolEditorDialog
          botId={botId}
          existingTool={editingTool}
          existingTools={tools}
          onClose={() => {
            setShowAddDialog(false)
            setEditingTool(null)
          }}
          onSuccess={() => {
            setShowAddDialog(false)
            setEditingTool(null)
            loadTools()
          }}
        />
      )}
    </div>
  )
}

interface ToolEditorDialogProps {
  botId: string
  existingTool: CustomTool | null
  existingTools: CustomTool[]
  onClose: () => void
  onSuccess: () => void
}

function ToolEditorDialog({ botId, existingTool, existingTools, onClose, onSuccess }: ToolEditorDialogProps) {
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonInput, setJsonInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form mode state
  const [name, setName] = useState(existingTool?.function.name || "")
  const [description, setDescription] = useState(existingTool?.function.description || "")
  const [webhookUrl, setWebhookUrl] = useState(existingTool?.function.url || "")
  const [async, setAsync] = useState(existingTool?.function.async || false)
  const [speakDuring, setSpeakDuring] = useState(existingTool?.function.speak_during_execution || false)
  const [speakAfter, setSpeakAfter] = useState(existingTool?.function.speak_after_execution || true)
  const [parameters, setParameters] = useState(
    JSON.stringify(existingTool?.function.parameters || {
      type: "object",
      properties: {},
      required: []
    }, null, 2)
  )

  useEffect(() => {
    if (existingTool) {
      setJsonInput(JSON.stringify(existingTool, null, 2))
    }
  }, [existingTool])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      let newTool: CustomTool

      if (jsonMode) {
        // Parse JSON input
        try {
          newTool = JSON.parse(jsonInput)
        } catch (err) {
          throw new Error("Invalid JSON format")
        }
      } else {
        // Build from form
        let parsedParams
        try {
          parsedParams = JSON.parse(parameters)
        } catch (err) {
          throw new Error("Invalid parameters JSON")
        }

        newTool = {
          type: "function",
          function: {
            name,
            description,
            parameters: parsedParams,
            ...(async && { async: true }),
            ...(speakDuring && { speak_during_execution: true }),
            ...(speakAfter && { speak_after_execution: true }),
            ...(webhookUrl && { url: webhookUrl })
          }
        }
      }

      // Validate tool name is unique (if adding new or changing name)
      if (!existingTool || existingTool.function.name !== newTool.function.name) {
        if (existingTools.some(t => t.function.name === newTool.function.name)) {
          throw new Error(`Tool "${newTool.function.name}" already exists`)
        }
      }

      // Update tools array
      let updatedTools: CustomTool[]
      if (existingTool) {
        // Replace existing tool
        updatedTools = existingTools.map(t =>
          t.function.name === existingTool.function.name ? newTool : t
        )
      } else {
        // Add new tool
        updatedTools = [...existingTools, newTool]
      }

      const response = await fetch(`/api/bots/${botId}/tools`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTools: updatedTools })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save tool")
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {existingTool ? "Edit Tool" : "Add Tool"}
          </h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setJsonMode(false)}
              className={`px-3 py-1 text-sm rounded ${
                !jsonMode
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Form Mode
            </button>
            <button
              type="button"
              onClick={() => setJsonMode(true)}
              className={`px-3 py-1 text-sm rounded ${
                jsonMode
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              JSON Mode
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {jsonMode ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Tool Definition (JSON)
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                placeholder={`{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name"
        }
      },
      "required": ["location"]
    }
  }
}`}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Function Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  pattern="[a-zA-Z0-9_-]+"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  placeholder="get_weather"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only letters, numbers, hyphens, and underscores
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Get current weather information for a specific location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Parameters Schema (JSON)
                </label>
                <textarea
                  value={parameters}
                  onChange={(e) => setParameters(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Webhook URL (optional)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://example.com/webhook"
                />
                <p className="text-xs text-gray-500 mt-1">
                  External endpoint to handle tool execution
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={async}
                    onChange={(e) => setAsync(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium">Async execution</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={speakDuring}
                    onChange={(e) => setSpeakDuring(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium">Speak during execution</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={speakAfter}
                    onChange={(e) => setSpeakAfter(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium">Speak after execution</span>
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : existingTool ? "Update" : "Add Tool"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
