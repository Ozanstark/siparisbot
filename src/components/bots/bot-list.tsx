"use client"

import { Bot } from "@prisma/client"
import BotCard from "./bot-card"

interface BotListProps {
  bots: Array<Bot & {
    _count?: { calls: number }
    assignments?: Array<{
      user: {
        id: string
        name: string | null
        email: string
      }
    }>
  }>
  isAdmin?: boolean
}

export default function BotList({ bots, isAdmin }: BotListProps) {
  if (bots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">No bots found</p>
        <p className="text-gray-400">
          {isAdmin
            ? "Create your first bot to get started"
            : "Ask your admin to assign a bot to you"}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bots.map((bot) => (
        <BotCard key={bot.id} bot={bot} isAdmin={isAdmin} />
      ))}
    </div>
  )
}
