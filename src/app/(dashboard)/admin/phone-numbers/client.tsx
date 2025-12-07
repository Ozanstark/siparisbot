"use client"

import { useState, useEffect } from "react"
import PhoneNumberCard from "@/components/phone-numbers/phone-number-card"
import ImportPhoneDialog from "@/components/phone-numbers/import-phone-dialog"
import PurchasePhoneDialog from "@/components/phone-numbers/purchase-phone-dialog"
import AssignNumberDialog from "@/components/numbers/assign-number-dialog"
import BindBotDialog from "@/components/numbers/bind-bot-dialog"

interface PhoneNumbersClientProps {
  hasApiKey: boolean
}

export default function PhoneNumbersClient({ hasApiKey }: PhoneNumbersClientProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Dialog states for Assign/Bind
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isBindBotDialogOpen, setIsBindBotDialogOpen] = useState(false)
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<any | null>(null)
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    // Load customers for assignment dialog
    fetch("/api/admin/customers")
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []))
      .catch(err => console.error("Failed to load customers", err))
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/phone-numbers/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      await loadPhoneNumbers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const loadPhoneNumbers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/phone-numbers")
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to load phone numbers")
      }
      const data = await response.json()
      setPhoneNumbers(data.phoneNumbers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hasApiKey) {
      loadPhoneNumbers()
    } else {
      setIsLoading(false)
    }
  }, [hasApiKey])

  const handleDialogClose = () => {
    setShowImportDialog(false)
    setShowPurchaseDialog(false)
    setIsAssignDialogOpen(false)
    setIsBindBotDialogOpen(false)
    setSelectedNumberId(null)
    setSelectedNumber(null)
    loadPhoneNumbers()
  }

  const handleAssign = (numberId: string) => {
    setSelectedNumberId(numberId)
    setIsAssignDialogOpen(true)
  }

  const handleBindAgent = (numberId: string) => {
    const number = phoneNumbers.find(n => n.dbData?.id === numberId)
    setSelectedNumber(number)
    setSelectedNumberId(numberId)
    setIsBindBotDialogOpen(true)
  }

  const handleUnassign = async (numberId: string) => {
    if (!confirm("Are you sure you want to unassign this number?")) return
    try {
      const response = await fetch(`/api/phone-numbers/${numberId}/assign`, {
        method: "DELETE"
      })
      if (response.ok) loadPhoneNumbers()
    } catch (error) {
      console.error("Error unassigning number:", error)
    }
  }

  if (!hasApiKey) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Phone Numbers</h1>
        <p className="text-gray-600 mb-8">Manage your phone numbers for inbound and outbound calls</p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Retell API Key Required
          </h3>
          <p className="text-yellow-700 mb-4">
            Please configure your Retell API key in the settings to manage phone numbers.
          </p>
          <a
            href="/admin/settings"
            className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Go to Settings
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-gray-600 mt-1">Manage your phone numbers for inbound and outbound calls</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Import Phone Number
          </button>
          <button
            onClick={() => setShowPurchaseDialog(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Purchase Number ($5/mo)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading phone numbers...</p>
        </div>
      ) : phoneNumbers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No phone numbers configured yet</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Import Your First Number
            </button>
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Purchase a Number
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Total: {phoneNumbers.length} phone number{phoneNumbers.length !== 1 ? "s" : ""}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phoneNumbers.map((phoneNumber) => (
              <PhoneNumberCard
                key={phoneNumber.phone_number}
                phoneNumber={phoneNumber}
                isAdmin={true}
                onUpdate={loadPhoneNumbers}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
                onBindAgent={handleBindAgent}
              />
            ))}
          </div>
        </>
      )}

      <ImportPhoneDialog
        isOpen={showImportDialog}
        onClose={handleDialogClose}
      />

      <PurchasePhoneDialog
        isOpen={showPurchaseDialog}
        onClose={handleDialogClose}
      />

      <AssignNumberDialog
        isOpen={isAssignDialogOpen}
        onClose={handleDialogClose}
        numberId={selectedNumberId}
        customers={customers}
      />

      <BindBotDialog
        isOpen={isBindBotDialogOpen}
        onClose={handleDialogClose}
        numberId={selectedNumberId}
        currentInboundBotId={selectedNumber?.dbData?.inboundAgentId}
        currentOutboundBotId={selectedNumber?.dbData?.outboundAgentId}
      />
    </>
  )
}
