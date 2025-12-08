"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import CallTable from "@/components/calls/call-table"
import InitiateCallDialog from "@/components/calls/initiate-call-dialog"
import WebCallInterface from "@/components/calls/web-call-interface"
import ActiveCallsDashboard from "@/components/calls/active-calls-dashboard"
import BatchCallUpload from "@/components/calls/batch-call-upload"

export const dynamic = "force-dynamic"

export default function CustomerCallsPage() {
  const { data: session, status } = useSession()
  const [calls, setCalls] = useState<any[]>([])
  const [bots, setBots] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"history" | "web-call" | "active" | "batch">("active")

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role !== "CUSTOMER") {
      return
    }

    Promise.all([
      fetch("/api/calls").then(r => r.json()),
      fetch("/api/bots").then(r => r.json())
    ]).then(([callsData, botsData]) => {
      setCalls(callsData.calls || [])
      setBots(botsData.bots || [])
      setIsLoading(false)
    }).catch(error => {
      console.error("Error fetching data:", error)
      setIsLoading(false)
    })
  }, [session])

  if (status === "loading" || isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!session || session.user.role !== "CUSTOMER") {
    return null
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Görüşmeler</h1>
        <p className="text-gray-600 mt-1">Görüşmelerinizi yönetin ve web araması yapın</p>
      </div>

      {bots.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          Size atanmış asistan bulunamadı. Lütfen yöneticinizle iletişime geçin.
        </div>
      ) : null}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Aktif Görüşmeler
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Görüşme Geçmişi
          </button>
          <button
            onClick={() => setActiveTab("web-call")}
            className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "web-call"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Web Araması
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "batch"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Toplu Arama
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "active" && (
        <ActiveCallsDashboard />
      )}

      {activeTab === "history" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={bots.length === 0}
            >
              + Telefon Araması Başlat
            </button>
          </div>
          <CallTable calls={calls} isAdmin={false} />
        </>
      )}

      {activeTab === "web-call" && (
        <div className="max-w-2xl">
          <WebCallInterface bots={bots} />
        </div>
      )}

      {activeTab === "batch" && (
        <div className="max-w-3xl">
          <BatchCallUpload bots={bots} />
        </div>
      )}

      <InitiateCallDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        bots={bots}
      />
    </div>
  )
}
