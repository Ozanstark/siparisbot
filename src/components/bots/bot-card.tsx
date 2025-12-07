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
import { Edit2, Trash2, Loader2 } from "lucide-react"

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

    if (!confirm(`Are you sure you want to delete "${bot.name}"? This will also delete it from Retell AI.`)) {
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
    if (!confirm("Are you sure you want to unassign this bot from the user?")) return

    setIsUnassigning(userId)
    try {
      await onUnassign?.(bot.id, userId)
    } finally {
      setIsUnassigning(null)
    }
  }

  return (
    <Card className="hover:scale-[1.02] transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{bot.name}</CardTitle>
            {bot.description && (
              <CardDescription className="mt-1 line-clamp-1">{bot.description}</CardDescription>
            )}
          </div>
          <Badge variant={bot.isActive ? "default" : "secondary"}>
            {bot.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2.5 text-sm">
        <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
          <span className="text-muted-foreground">Voice</span>
          <span className="font-medium">{bot.voiceId}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{bot.model}</span>
        </div>
        {bot._count && (
          <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
            <span className="text-muted-foreground">Total Calls</span>
            <span className="font-medium">{bot._count.calls}</span>
          </div>
        )}
        {isAdmin && bot.assignments && bot.assignments.length > 0 && (
          <div className="py-2 border-t mt-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Assigned To</span>
            <div className="space-y-1">
              {bot.assignments.map((assignment) => (
                <div key={assignment.user.id} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs">
                  <span>{assignment.user.name || assignment.user.email}</span>
                  <button
                    onClick={() => handleUnassign(assignment.user.id)}
                    disabled={isUnassigning === assignment.user.id}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    {isUnassigning === assignment.user.id ? "..." : "×"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 gap-2 flex-wrap">
        <Link
          href={isAdmin ? `/admin/bots/${bot.id}` : `/customer/bots/${bot.id}`}
          className="flex-1"
        >
          <Button className="w-full" variant="default">
            View Details
          </Button>
        </Link>
        <Link
          href={isAdmin ? `/admin/bots/${bot.id}/edit` : `/customer/bots/${bot.id}/edit`}
        >
          <Button variant="outline" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
        </Link>
        {isAdmin && (
          <>
            <Button
              variant="outline"
              onClick={() => onAssign?.(bot.id)}
              className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              Assign
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
