"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import NumberCard from "@/components/numbers/number-card"
import AddNumberDialog from "@/components/numbers/add-number-dialog"
import AssignNumberDialog from "@/components/numbers/assign-number-dialog"
import BindBotDialog from "@/components/numbers/bind-bot-dialog"

export const dynamic = "force-dynamic"

export default function AdminNumbersPage() {
  const { data: session, status } = useSession()
  const [numbers, setNumbers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isBindBotDialogOpen, setIsBindBotDialogOpen] = useState(false)
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role !== "ADMIN") {
      return
    }

    loadData()
  }, [session])

  const loadData = async () => {
    try {
      const [numbersRes, customersRes] = await Promise.all([
        fetch("/api/numbers"),
        fetch("/api/admin/customers")
      ])

      const numbersData = await numbersRes.json()
      const customersData = await customersRes.json()

      setNumbers(numbersData.numbers || [])
      setCustomers(customersData.customers || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetch("/api/numbers?sync=true")
      loadData()
    } catch (error) {
      console.error("Error syncing numbers:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAssign = (numberId: string) => {
    setSelectedNumberId(numberId)
    setIsAssignDialogOpen(true)
  }

  const handleUnassign = async (numberId: string) => {
    if (!confirm("Are you sure you want to unassign this number?")) return

    try {
      const response = await fetch(`/api/numbers/${numberId}/assign`, {
        method: "DELETE"
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Error unassigning number:", error)
    }
  }

  const handleBindAgent = (numberId: string) => {
    const number = numbers.find(n => n.id === numberId)
    setSelectedNumber(number)
    setSelectedNumberId(numberId)
    setIsBindBotDialogOpen(true)
  }

  const handleDelete = async (numberId: string) => {
    if (!confirm("Are you sure you want to delete this number? This will also remove it from Retell.")) return

    try {
      const response = await fetch(`/api/numbers/${numberId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Error deleting number:", error)
    }
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-gray-600 mt-1">Manage phone numbers and assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync from Retell"}
          </button>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Number
          </button>
        </div>
      </div>

      {numbers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No phone numbers yet</p>
          <p className="text-gray-400">Purchase or import your first phone number to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {numbers.map((number) => (
            <NumberCard
              key={number.id}
              number={number}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              onBindAgent={handleBindAgent}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddNumberDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false)
          loadData()
        }}
      />

      <AssignNumberDialog
        isOpen={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false)
          setSelectedNumberId(null)
          loadData()
        }}
        numberId={selectedNumberId}
        customers={customers}
      />

      <BindBotDialog
        isOpen={isBindBotDialogOpen}
        onClose={() => {
          setIsBindBotDialogOpen(false)
          setSelectedNumberId(null)
          setSelectedNumber(null)
          loadData()
        }}
        numberId={selectedNumberId}
        currentInboundBotId={selectedNumber?.dbData?.inboundAgentId}
        currentOutboundBotId={selectedNumber?.dbData?.outboundAgentId}
      />
    </div>
  )
}
