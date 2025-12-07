"use client"

import ProfileForm from "@/components/settings/profile-form"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function CustomerSettingsPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  if (status === "loading") {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <ProfileForm />
    </div>
  )
}
