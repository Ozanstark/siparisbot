import { useState, useEffect } from "react"
import PhoneNumberCard from "@/components/phone-numbers/phone-number-card"
import ImportPhoneDialog from "@/components/phone-numbers/import-phone-dialog"
import PurchasePhoneDialog from "@/components/phone-numbers/purchase-phone-dialog"
import AssignNumberDialog from "@/components/numbers/assign-number-dialog"
import BindBotDialog from "@/components/numbers/bind-bot-dialog"
import { Phone, Download, Plus, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react"

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
      setTimeout(() => setIsSyncing(false), 1000) // Cosmetic delay
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
    if (!confirm("Bu numaranın atamasını kaldırmak istediğinize emin misiniz?")) return
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-full mb-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-yellow-400/20 blur-xl group-hover:blur-2xl transition-all" />
          <AlertTriangle className="h-10 w-10 text-yellow-600 dark:text-yellow-400 relative z-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2 tracking-tight">API Anahtarı Gerekli</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
          Telefon numaralarını yönetmek için önce organizasyon ayarlarından Retell API anahtarınızı girmeniz gerekiyor.
        </p>

        <a
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          Ayarlara Git <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            Telefon Hatları
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
              ADMIN
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">
            Gelen ve giden aramalar için SIP trunk ve sanal numaraları yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-200 rounded-xl font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${isSyncing ? 'opacity-70 cursor-wait' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Senkronize ediliyor..." : "Senkronize Et"}
          </button>

          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block" />

          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Download className="h-4 w-4" />
            İçe Aktar (SIP/BYOC)
          </button>
          <button
            onClick={() => setShowPurchaseDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            Satın Al ($5)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-3xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      ) : phoneNumbers.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="mx-auto h-24 w-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50 dark:ring-gray-800/30">
            <Phone className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Henüz Numara Yok</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Sistemi kullanmaya başlamak için bir numara bağlayın veya satın alın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-6 py-3 bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Mevcut Numarayı Taşı
            </button>
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              Yeni Numara Al
            </button>
          </div>
        </div>
      ) : (
        <>
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
    </div>
  )
}
