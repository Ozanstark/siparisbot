"use client"

import { useState, useEffect } from "react"
import { formatDate } from "@/lib/utils"

interface BotVersion {
  id: string
  versionNumber: number
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  name: string
  description: string | null
  voiceId: string
  model: string
  generalPrompt: string
  beginMessage: string | null
  publishedAt: string | null
  createdAt: string
}

interface VersionManagerProps {
  botId: string
  isAdmin: boolean
}

export default function VersionManager({ botId, isAdmin }: VersionManagerProps) {
  const [versions, setVersions] = useState<BotVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      } else {
        throw new Error("Failed to load versions")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVersions()
  }, [botId])

  const createDraftVersion = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Will copy from current bot config
      })

      if (response.ok) {
        loadVersions()
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to create draft")
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const publishVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to publish this version? This will update the live bot.")) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/versions/${versionId}/publish`, {
        method: "POST",
      })

      if (response.ok) {
        loadVersions()
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to publish version")
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to delete this draft version?")) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/versions/${versionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadVersions()
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete version")
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PUBLISHED: "bg-green-100 text-green-800",
      DRAFT: "bg-yellow-100 text-yellow-800",
      ARCHIVED: "bg-gray-100 text-gray-800",
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading versions...</div>
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Version History</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage bot versions with draft/publish workflow
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={createDraftVersion}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Draft
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {versions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No versions yet</p>
          {isAdmin && (
            <p className="text-sm text-gray-400 mt-1">
              Create a draft version to start version management
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="border rounded-lg overflow-hidden"
            >
              <div
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-700">
                      v{version.versionNumber}
                    </span>
                    {getStatusBadge(version.status)}
                    <span className="text-sm text-gray-600">{version.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {version.publishedAt
                        ? `Published ${formatDate(version.publishedAt)}`
                        : `Created ${formatDate(version.createdAt)}`}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedVersion === version.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {expandedVersion === version.id && (
                <div className="border-t bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Model:</span>
                      <span className="ml-2 font-medium">{version.model}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Voice:</span>
                      <span className="ml-2 font-medium">{version.voiceId}</span>
                    </div>
                    {version.description && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Description:</span>
                        <p className="text-sm mt-1">{version.description}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-600">General Prompt:</span>
                      <p className="text-sm mt-1 bg-white p-3 rounded border whitespace-pre-wrap">
                        {version.generalPrompt}
                      </p>
                    </div>
                    {version.beginMessage && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Begin Message:</span>
                        <p className="text-sm mt-1">{version.beginMessage}</p>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-3 pt-3 border-t">
                      {version.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => publishVersion(version.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Publish Version
                          </button>
                          <button
                            onClick={() => deleteVersion(version.id)}
                            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm font-medium"
                          >
                            Delete Draft
                          </button>
                        </>
                      )}
                      {version.status === "PUBLISHED" && (
                        <span className="text-sm text-green-600 font-medium">
                          Currently Live
                        </span>
                      )}
                      {version.status === "ARCHIVED" && (
                        <button
                          onClick={() => publishVersion(version.id)}
                          className="px-4 py-2 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm font-medium"
                        >
                          Rollback to This Version
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
