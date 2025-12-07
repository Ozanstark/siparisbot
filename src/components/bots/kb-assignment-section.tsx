"use client"

import { useState, useEffect } from "react"
import { Database, Plus, X, Settings } from "lucide-react"

interface KnowledgeBase {
  id: string
  name: string
  retellKnowledgeBaseId: string
  texts: string[]
}

interface BotKnowledgeBase {
  id: string
  topK: number
  filterScore: number
  knowledgeBase: KnowledgeBase
}

interface KBAssignmentSectionProps {
  botId: string
}

export default function KBAssignmentSection({ botId }: KBAssignmentSectionProps) {
  const [assignments, setAssignments] = useState<BotKnowledgeBase[]>([])
  const [availableKBs, setAvailableKBs] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  useEffect(() => {
    loadAssignments()
    loadAvailableKBs()
  }, [])

  const loadAssignments = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/knowledge-bases`)
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments)
      }
    } catch (err) {
      console.error("Failed to load KB assignments:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableKBs = async () => {
    try {
      const response = await fetch("/api/knowledge-bases")
      if (response.ok) {
        const data = await response.json()
        setAvailableKBs(data.knowledgeBases)
      }
    } catch (err) {
      console.error("Failed to load knowledge bases:", err)
    }
  }

  const handleUnassign = async (assignmentId: string, kbName: string) => {
    if (!confirm(`Remove "${kbName}" from this bot?`)) return

    try {
      const response = await fetch(`/api/bots/${botId}/knowledge-bases/${assignmentId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to unassign knowledge base")
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const assignedKBIds = assignments.map(a => a.knowledgeBase.id)
  const unassignedKBs = availableKBs.filter(kb => !assignedKBIds.includes(kb.id))

  if (isLoading) {
    return <div className="text-gray-500">Loading knowledge bases...</div>
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Knowledge Bases
        </h2>
        <button
          onClick={() => setShowAssignDialog(true)}
          disabled={unassignedKBs.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} />
          Assign KB
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p>No knowledge bases assigned</p>
          <p className="text-sm mt-1">Add knowledge bases to provide context to your agent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <h3 className="font-medium">{assignment.knowledgeBase.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  {assignment.knowledgeBase.retellKnowledgeBaseId}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                  <span>Top K: <strong>{assignment.topK}</strong></span>
                  <span>Filter Score: <strong>{assignment.filterScore}</strong></span>
                  <span>{assignment.knowledgeBase.texts.length} chunks</span>
                </div>
              </div>
              <button
                onClick={() => handleUnassign(assignment.id, assignment.knowledgeBase.name)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAssignDialog && (
        <AssignKBDialog
          botId={botId}
          availableKBs={unassignedKBs}
          onClose={() => setShowAssignDialog(false)}
          onSuccess={() => {
            setShowAssignDialog(false)
            loadAssignments()
          }}
        />
      )}
    </div>
  )
}

interface AssignKBDialogProps {
  botId: string
  availableKBs: KnowledgeBase[]
  onClose: () => void
  onSuccess: () => void
}

function AssignKBDialog({ botId, availableKBs, onClose, onSuccess }: AssignKBDialogProps) {
  const [selectedKBId, setSelectedKBId] = useState(availableKBs[0]?.id || "")
  const [topK, setTopK] = useState(3)
  const [filterScore, setFilterScore] = useState(0.5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/bots/${botId}/knowledge-bases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledgeBaseId: selectedKBId,
          topK,
          filterScore
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to assign knowledge base")
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
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Assign Knowledge Base</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Knowledge Base <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedKBId}
              onChange={(e) => setSelectedKBId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableKBs.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name} ({kb.texts.length} chunks)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Top K (Results to retrieve)
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of most relevant chunks to retrieve (1-20)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Filter Score (Relevance threshold)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={filterScore}
              onChange={(e) => setFilterScore(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum similarity score to include results (0-1)
            </p>
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Assigning..." : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
