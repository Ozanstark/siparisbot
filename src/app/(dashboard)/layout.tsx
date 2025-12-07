import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const isAdmin = session.user.role === "ADMIN"
  const basePath = isAdmin ? "/admin" : "/customer"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href={`${basePath}/bots`} className="text-xl font-bold text-gray-900">
                Retell Dashboard
              </Link>
              <div className="flex gap-4">
                <Link
                  href={`${basePath}/bots`}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Bots
                </Link>
                {!isAdmin && (
                  <>
                    <Link
                      href={`${basePath}/calls`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Calls
                    </Link>
                    <Link
                      href={`${basePath}/knowledge-bases`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Knowledge Bases
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <>
                    <Link
                      href={`${basePath}/customers`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Customers
                    </Link>
                    <Link
                      href={`${basePath}/numbers`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Numbers
                    </Link>
                    <Link
                      href={`${basePath}/knowledge-bases`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Knowledge Bases
                    </Link>
                    <Link
                      href={`${basePath}/settings`}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <p className="font-medium">{session.user.name}</p>
                <p className="text-gray-500 text-xs">{session.user.role}</p>
              </div>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
