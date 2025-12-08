"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bot } from "@prisma/client"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, Loader2, UserMinus } from "lucide-react"

interface BotCardProps {
  bot: Bot & {
    _count?: { calls: number }
    assignments?: Array<{
      user: {
        id: string
        name: string | null
        email: string
      }
    }>
  }
  onAssign?: (id: string) => void
  onUnassign?: (botId: string, userId: string) => void
  isAdmin?: boolean
}

export default function BotCard({ bot, isAdmin, onAssign, onUnassign }: BotCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!confirm(`"${bot.name}" adlı asistanı silmek istediğinize emin misiniz? Bu işlem Retell AI üzerinden de silecektir.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete bot")
      }

      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
      setIsDeleting(false)
    }
  }

  const handleUnassign = async (userId: string) => {
    if (!confirm("Bu asistanın atamasını kaldırmak istediğinize emin misiniz?")) return

    setIsUnassigning(userId)
    try {
      await onUnassign?.(bot.id, userId)
    } finally {
      setIsUnassigning(null)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-gray-100 flex flex-col h-full">
      <CardHeader className="pb-4 space-y-1">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-gray-900 leading-tight">{bot.name}</CardTitle>
            {bot.description && (
              <CardDescription className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                {bot.description}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={bot.isActive ? "default" : "secondary"}
            className={bot.isActive ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200"}
          >
            {bot.isActive ? "Aktif" : "Pasif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex-grow">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ses</div>
            <div className="text-sm font-semibold text-gray-900 truncate" title={bot.voiceId}>{bot.voiceId}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Model</div>
            <div className="text-sm font-semibold text-gray-900 truncate" title={bot.model}>{bot.model}</div>
          </div>
          {bot._count && (
            <div className="space-y-1 col-span-2 pt-2 border-t border-gray-200/50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Görüşme</span>
                <Badge variant="secondary" className="bg-white border-gray-200 font-mono">
                  {bot._count.calls}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        {isAdmin && bot.assignments && bot.assignments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Atanan Kişiler</span>
              <div className="h-px bg-gray-100 flex-grow"></div>
            </div>
            <div className="space-y-2">
              {bot.assignments.map((assignment) => (
                <div key={assignment.user.id} className="flex justify-between items-center bg-white border border-gray-100 p-2.5 rounded-lg text-sm shadow-sm group hover:border-blue-100 transition-colors">
                  <span className="font-medium text-gray-700 truncate mr-2">{assignment.user.name || assignment.user.email}</span>
                  <button
                    onClick={() => handleUnassign(assignment.user.id)}
                    disabled={isUnassigning === assignment.user.id}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded"
                    title="Atamayı Kaldır"
                  >
                    {isUnassigning === assignment.user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t bg-gray-50/30 flex gap-3">
        <Link
          href={isAdmin ? `/admin/bots/${bot.id}` : `/customer/bots/${bot.id}`}
          className="flex-1"
        >
          <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm transition-all" size="default">
            Detaylar
          </Button>
        </Link>

        <Link
          href={isAdmin ? `/admin/bots/${bot.id}/edit` : `/customer/bots/${bot.id}/edit`}
        >
          <Button variant="outline" size="icon" className="border-gray-200 hover:bg-white hover:text-blue-600 transition-colors">
            <Edit2 className="h-4 w-4" />
          </Button>
        </Link>

        {isAdmin && (
          <>
            <Button
              variant="outline"
              onClick={() => onAssign?.(bot.id)}
              className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors px-4"
            >
              Ata
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
