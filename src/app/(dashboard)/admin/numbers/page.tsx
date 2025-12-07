import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function LegacyNumbersPage() {
  redirect("/admin/phone-numbers")
}
