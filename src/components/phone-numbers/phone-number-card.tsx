"use client"

import { useState } from "react"
import Link from "next/link"

interface PhoneNumberCardProps {
  phoneNumber: any
  isAdmin: boolean
  onUpdate?: () => void
}

export default function PhoneNumberCard({ phoneNumber, isAdmin, onUpdate }: PhoneNumberCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const dbData = phoneNumber.dbData

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${phoneNumber.phone_number_pretty || phoneNumber.phone_number}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/phone-numbers/${dbData?.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete phone number")
      }

      onUpdate?.()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {phoneNumber.phone_number_pretty || phoneNumber.phone_number}
          </h3>
          {phoneNumber.nickname && (
            <p className="text-sm text-gray-500 mt-1">{phoneNumber.nickname}</p>
          )}
          {dbData?.nickname && phoneNumber.nickname !== dbData.nickname && (
            <p className="text-sm text-gray-500 mt-1">{dbData.nickname}</p>
          )}
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 text-xs rounded ${
            phoneNumber.phone_number_type === "retell-twilio"
              ? "bg-blue-100 text-blue-700"
              : "bg-green-100 text-green-700"
          }`}>
            {phoneNumber.phone_number_type || "imported"}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Area Code:</span>
          <span className="font-medium">{phoneNumber.area_code || "N/A"}</span>
        </div>

        {phoneNumber.inbound_agent_id && (
          <div className="flex justify-between">
            <span className="text-gray-500">Inbound Agent:</span>
            <span className="font-medium text-blue-600 truncate max-w-[200px]">
              {dbData?.boundAgent?.name || phoneNumber.inbound_agent_id}
            </span>
          </div>
        )}

        {phoneNumber.outbound_agent_id && phoneNumber.outbound_agent_id !== phoneNumber.inbound_agent_id && (
          <div className="flex justify-between">
            <span className="text-gray-500">Outbound Agent:</span>
            <span className="font-medium text-blue-600 truncate max-w-[200px]">
              {phoneNumber.outbound_agent_id}
            </span>
          </div>
        )}

        {dbData?.assignedTo && (
          <div className="flex justify-between">
            <span className="text-gray-500">Assigned To:</span>
            <span className="font-medium">{dbData.assignedTo.name || dbData.assignedTo.email}</span>
          </div>
        )}

        {phoneNumber.inbound_webhook_url && (
          <div className="flex justify-between">
            <span className="text-gray-500">Webhook:</span>
            <span className="font-medium text-xs text-gray-600 truncate max-w-[200px]">
              {phoneNumber.inbound_webhook_url}
            </span>
          </div>
        )}

        {phoneNumber.last_modification_timestamp && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last Modified:</span>
            <span className="text-xs">
              {new Date(phoneNumber.last_modification_timestamp).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {isAdmin && dbData && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Link
            href={`/admin/phone-numbers/${dbData.id}`}
            className="flex-1 px-3 py-2 text-sm text-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            View Details
          </Link>
          <Link
            href={`/admin/phone-numbers/${dbData.id}/edit`}
            className="flex-1 px-3 py-2 text-sm text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  )
}
