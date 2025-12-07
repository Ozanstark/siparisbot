"use client"

import { PhoneNumber, User, Bot } from "@prisma/client"

interface NumberCardProps {
  number: any // Combined Retell + DB data
  onAssign?: (numberId: string) => void
  onUnassign?: (numberId: string) => void
  onBindAgent?: (numberId: string) => void
  onDelete?: (numberId: string) => void
}

export default function NumberCard({ number, onAssign, onUnassign, onBindAgent, onDelete }: NumberCardProps) {
  const dbData = number.dbData || {}
  const phoneNumber = number.phone_number || number.number
  const numberId = dbData.id || number.id

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold font-mono">{phoneNumber}</h3>
          {dbData.nickname && (
            <p className="text-sm text-gray-600 mt-1">{dbData.nickname}</p>
          )}
          {number.phone_number && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Retell ID: {number.phone_number.slice(0, 12)}...
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span
            className={`px-2 py-1 text-xs rounded ${
              dbData.isActive !== false
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {dbData.isActive !== false ? "Active" : "Inactive"}
          </span>
          {number.phone_number && (
            <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
              Retell Managed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="font-medium">
            {dbData.assignedToUserId ? "Assigned to Customer" : "Available"}
          </span>
        </div>
        {dbData.assignedTo && (
          <div className="flex justify-between">
            <span className="text-gray-600">Assigned To:</span>
            <span className="font-medium">{dbData.assignedTo.name || dbData.assignedTo.email}</span>
          </div>
        )}
        {dbData.inboundAgent && (
          <div className="flex justify-between">
            <span className="text-gray-600">Inbound Bot:</span>
            <span className="font-medium text-blue-600">{dbData.inboundAgent.name}</span>
          </div>
        )}
        {!dbData.inboundAgent && (
          <div className="flex justify-between">
            <span className="text-gray-600">Inbound Bot:</span>
            <span className="text-gray-500 italic">Not configured</span>
          </div>
        )}
        {dbData.outboundAgent && (
          <div className="flex justify-between">
            <span className="text-gray-600">Outbound Bot:</span>
            <span className="font-medium text-green-600">{dbData.outboundAgent.name}</span>
          </div>
        )}
        {!dbData.outboundAgent && (
          <div className="flex justify-between">
            <span className="text-gray-600">Outbound Bot:</span>
            <span className="text-gray-500 italic">Not configured</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {dbData.assignedToUserId ? (
          <button
            onClick={() => onUnassign?.(numberId)}
            className="flex-1 min-w-[120px] text-center px-3 py-2 text-sm border border-orange-300 text-orange-600 rounded hover:bg-orange-50 transition-colors"
          >
            Unassign
          </button>
        ) : (
          <button
            onClick={() => onAssign?.(numberId)}
            className="flex-1 min-w-[120px] text-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Assign Customer
          </button>
        )}
        <button
          onClick={() => onBindAgent?.(numberId)}
          className="flex-1 min-w-[120px] text-center px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
        >
          {dbData.inboundAgent || dbData.outboundAgent ? "Change Bots" : "Bind Bots"}
        </button>
        <button
          onClick={() => onDelete?.(numberId)}
          className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
