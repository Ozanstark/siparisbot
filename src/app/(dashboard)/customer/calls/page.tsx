"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import CallTable from "@/components/calls/call-table"

export const dynamic = "force-dynamic"

export default function CustomerCallsPage() {
  const { data: session, status } = useSession()
  const [calls, setCalls] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role !== "CUSTOMER") {
      return
    }

    fetch("/api/calls")
      .then(r => r.json())
      .then(callsData => {
        setCalls(callsData.calls || [])
        setIsLoading(false)
      })
      .catch(error => {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      })
  }, [session])

  if (status === "loading" || isLoading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  if (!session || session.user.role !== "CUSTOMER") {
    return null
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Görüşmeler</h1>
        <p className="text-gray-600 mt-1">Gelen çağrıların listesi ve detayları</p>
      </div>

      <CallTable calls={calls} isAdmin={false} />
    </div>
  )
}
