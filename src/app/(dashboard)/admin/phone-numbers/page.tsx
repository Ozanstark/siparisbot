import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PhoneNumbersClient from "./client"

export default async function AdminPhoneNumbersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/customer/dashboard")
  }

  // Get organization API key status
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { retellApiKey: true }
  })

  const hasApiKey = !!organization?.retellApiKey

  return (
    <div className="p-8">
      <PhoneNumbersClient hasApiKey={hasApiKey} />
    </div>
  )
}
