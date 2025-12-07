"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import CustomerCard from "@/components/customers/customer-card"
import AddCustomerDialog from "@/components/customers/add-customer-dialog"

export default function AdminCustomersPage() {
  const { data: session, status } = useSession()
  const [customers, setCustomers] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role !== "ADMIN") {
      return
    }

    loadCustomers()
  }, [session])

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/admin/customers")
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error("Error loading customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer? This will also delete all their data.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        loadCustomers()
      }
    } catch (error) {
      console.error("Error deleting customer:", error)
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer accounts</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Create Customer
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No customers yet</p>
          <p className="text-gray-400">Create your first customer account to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddCustomerDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          loadCustomers()
        }}
      />
    </div>
  )
}
