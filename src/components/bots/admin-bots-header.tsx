"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import SyncBotsButton from "./sync-bots-button"

export default function AdminBotsHeader() {
  const router = useRouter()

  const handleSyncSuccess = () => {
    router.refresh()
  }

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Asistanlar</h1>
        <p className="text-gray-600 mt-1">Sesli asistanlarınızı yönetin</p>
      </div>
      <div className="flex gap-3">
        <SyncBotsButton onSuccess={handleSyncSuccess} />
        <Link href="/admin/bots/new">
          <Button className="shadow-lg shadow-primary/20">
            + Asistan Oluştur
          </Button>
        </Link>
      </div>
    </div>
  )
}
