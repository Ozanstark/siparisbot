"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Plus, Trash2, Edit, Database, FileText } from "lucide-react"

interface KnowledgeBase {
  id: string
  name: string
  texts: string[]
  enableAutoRefresh: boolean
  retellKnowledgeBaseId: string
  createdAt: string
  updatedAt: string
  _count: {
    bots: number
  }
}

export default function KnowledgeBasesPage() {
  const { data: session, status } = useSession()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingKB, setEditingKB] = useState<KnowledgeBase | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      loadKnowledgeBases()
    }
  }, [session])

  const loadKnowledgeBases = async () => {
    try {
      const response = await fetch("/api/knowledge-bases")
      if (response.ok) {
        const data = await response.json()
        setKnowledgeBases(data.knowledgeBases)
      } else {
        throw new Error("Failed to load knowledge bases")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove it from all assigned bots.`)) {
      return
    }

    try {
      const response = await fetch(`/api/knowledge-bases/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setKnowledgeBases(prev => prev.filter(kb => kb.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete knowledge base")
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Bases</h1>
          <p className="text-gray-600 mt-1">
            Manage document collections for your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Knowledge Base
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {knowledgeBases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No knowledge bases</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating a new knowledge base for your agents.
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Knowledge Base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeBases.map((kb) => (
            <div
              key={kb.id}
              className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{kb.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">
                      {kb.retellKnowledgeBaseId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Text Chunks:</span>
                  <span className="font-medium flex items-center gap-1">
                    <FileText size={14} />
                    {kb.texts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Assigned to Bots:</span>
                  <span className="font-medium">{kb._count.bots}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Auto Refresh:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      kb.enableAutoRefresh
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {kb.enableAutoRefresh ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <button
                  onClick={() => {
                    setEditingKB(kb)
                    setShowCreateDialog(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(kb.id, kb.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Updated {new Date(kb.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <KnowledgeBaseDialog
          knowledgeBase={editingKB}
          onClose={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
          }}
          onSuccess={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
            loadKnowledgeBases()
          }}
        />
      )}
    </div>
  )
}

interface KnowledgeBaseDialogProps {
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
  onSuccess: () => void
}

function KnowledgeBaseDialog({ knowledgeBase, onClose, onSuccess }: KnowledgeBaseDialogProps) {
  const [formData, setFormData] = useState({
    name: knowledgeBase?.name || "",
    texts: knowledgeBase?.texts.join("\n\n---\n\n") || "",
    enableAutoRefresh: knowledgeBase?.enableAutoRefresh || false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const texts = formData.texts
        .split(/\n\n---\n\n/)
        .map(t => t.trim())
        .filter(t => t.length > 0)

      if (texts.length === 0) {
        throw new Error("At least one text chunk is required")
      }

      const payload = {
        name: formData.name,
        texts,
        enableAutoRefresh: formData.enableAutoRefresh
      }

      const url = knowledgeBase
        ? `/api/knowledge-bases/${knowledgeBase.id}`
        : "/api/knowledge-bases"

      const response = await fetch(url, {
        method: knowledgeBase ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save knowledge base")
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
          <h2 className="text-2xl font-bold">
            {knowledgeBase ? "Edit Knowledge Base" : "Create Knowledge Base"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer Support KB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Text Chunks <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Separate multiple text chunks with <code className="bg-gray-100 px-1 py-0.5 rounded">---</code> on a new line
            </p>
            <textarea
              required
              value={formData.texts}
              onChange={(e) => setFormData({ ...formData, texts: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Our business hours are Monday to Friday, 9 AM to 5 PM.

---

We offer free shipping on orders over $50.

---

Returns are accepted within 30 days of purchase."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.texts.split(/\n\n---\n\n/).filter(t => t.trim().length > 0).length} chunk(s)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={formData.enableAutoRefresh}
              onChange={(e) => setFormData({ ...formData, enableAutoRefresh: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm font-medium">
              Enable Auto Refresh
            </label>
          </div>

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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : knowledgeBase ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
