"use client"

import { useState, useEffect } from "react"
import { Bot } from "@prisma/client"
import BotCard from "./bot-card"
import AssignBotDialog from "./assign-bot-dialog"
import { useRouter } from "next/navigation"

interface BotListProps {
  bots: Array<Bot & {
    _count?: { calls: number }
    assignments?: Array<{
      user: {
        id: string
        name: string | null
        email: string
      }
    }>
  }>
  isAdmin?: boolean
}

export default function BotList({ bots, isAdmin }: BotListProps) {
  const router = useRouter()
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    if (isAdmin && isAssignDialogOpen && customers.length === 0) {
      fetch("/api/admin/customers")
        .then(res => res.json())
        .then(data => setCustomers(data.customers || []))
        .catch(err => console.error("Failed to load customers", err))
    }
  }, [isAdmin, isAssignDialogOpen, customers.length])

  const handleAssignClick = (botId: string) => {
    setSelectedBotId(botId)
    setIsAssignDialogOpen(true)
  }

  const handleAssignSuccess = () => {
    router.refresh()
  }

  const handleUnassign = async (botId: string, userId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/assign?userId=${userId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        router.refresh()
      } else {
        throw new Error("Failed to unassign")
      }
    } catch (error) {
      console.error("Error unassigning:", error)
      alert("Failed to unassign user")
    }
  }

  if (bots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">No bots found</p>
        <p className="text-gray-400">
          {isAdmin
            ? "Create your first bot to get started"
            : "Ask your admin to assign a bot to you"}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            isAdmin={isAdmin}
            onAssign={handleAssignClick}
            onUnassign={handleUnassign}
          />
        ))}
      </div>

      {isAdmin && (
        <AssignBotDialog
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          botId={selectedBotId}
          customers={customers}
          onAssignSuccess={handleAssignSuccess}
        />
      )}
    </>
  )
}
