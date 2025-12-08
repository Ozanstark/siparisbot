"use client"

import Link from "next/link"
import { Call, CallAnalytics, Bot, User } from "@prisma/client"
import { formatDate, formatDuration } from "@/lib/utils"

interface CallTableProps {
  calls: Array<
    Call & {
      bot: Pick<Bot, "id" | "name">
      initiatedBy: Pick<User, "id" | "name" | "email">
      analytics: CallAnalytics | null
    }
  >
  isAdmin?: boolean
}

export default function CallTable({ calls, isAdmin }: CallTableProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Henüz görüşme yok</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Tarih
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Asistan
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Aranan Numara
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Süre
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Durum
            </th>
            {isAdmin && (
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                Başlatan
              </th>
            )}
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Duygu Analizi
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4 text-sm">
                {formatDate(call.createdAt)}
              </td>
              <td className="py-3 px-4 text-sm font-medium">
                {call.bot.name}
              </td>
              <td className="py-3 px-4 text-sm font-mono">{call.toNumber}</td>
              <td className="py-3 px-4 text-sm">
                {call.durationMs ? formatDuration(call.durationMs) : "-"}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 text-xs rounded ${call.status === "ANALYZED"
                      ? "bg-green-100 text-green-800"
                      : call.status === "ENDED"
                        ? "bg-blue-100 text-blue-800"
                        : call.status === "IN_PROGRESS"
                          ? "bg-yellow-100 text-yellow-800"
                          : call.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                >
                  {call.status}
                </span>
              </td>
              {isAdmin && (
                <td className="py-3 px-4 text-sm">
                  {call.initiatedBy.name || call.initiatedBy.email}
                </td>
              )}
              <td className="py-3 px-4 text-sm">
                {call.analytics?.sentiment ? (
                  <span
                    className={`px-2 py-1 text-xs rounded ${call.analytics.sentiment === "positive"
                        ? "bg-green-100 text-green-800"
                        : call.analytics.sentiment === "negative"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {call.analytics.sentiment}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="py-3 px-4 text-sm">
                <Link
                  href={`${isAdmin ? "/admin" : "/customer"}/calls/${call.id}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Görüntüle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
