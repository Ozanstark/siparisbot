"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface AddCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddCustomerDialog({ isOpen, onClose }: AddCustomerDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    customerType: "RESTAURANT"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create customer")
      }

      router.refresh()
      onClose()
      setFormData({ name: "", email: "", password: "", customerType: "RESTAURANT" })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Müşteri Hesabı Oluştur</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">İsim *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">E-posta *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">İşletme Tipi *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, customerType: "RESTAURANT" })}
                className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${formData.customerType === "RESTAURANT"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Restoran 🍔
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, customerType: "HOTEL" })}
                className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${formData.customerType === "HOTEL"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Otel 🏨
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.customerType === "RESTAURANT"
                ? "Sipariş yönetimi aktif olacak."
                : "Oda ve rezervasyon yönetimi aktif olacak."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Şifre *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="En az 8 karakter"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Şifre en az 8 karakter olmalı
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Oluşturuluyor..." : "Müşteri Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
