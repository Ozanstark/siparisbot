import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
export const dynamic = "force-dynamic"

  LayoutDashboard,
  Phone,
  FileText,
  Settings,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X
} from "lucide-react"

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

  const navigation = [
    { name: 'Bots', href: `${basePath}/bots`, icon: LayoutDashboard },
    { name: 'Calls', href: `${basePath}/calls`, icon: Phone },
    // Show Orders for everyone (unified role) or conditional if needed
    { name: 'Orders', href: `${basePath}/orders`, icon: FileText },
    { name: 'Knowledge Bases', href: `${basePath}/knowledge-bases`, icon: BookOpen },
  ]

  const adminNavigation = [
    { name: 'Customers', href: `${basePath}/customers`, icon: Users },
    { name: 'Phone Numbers', href: `${basePath}/numbers`, icon: Phone },
    { name: 'Settings', href: `${basePath}/settings`, icon: Settings },
  ]

  const navItems = isAdmin ? [...navigation, ...adminNavigation] : navigation

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 hidden md:flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <Phone className="h-5 w-5" />
            </span>
            RezonAll
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">
            Platform
          </div>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-primary/5 hover:text-primary transition-all group"
            >
              <item.icon className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-white">
              {session.user.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="h-16 md:hidden flex items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
          <Link href="/" className="font-bold text-lg text-primary flex items-center gap-2">
            <Phone className="h-5 w-5 fill-primary" />
            RezonAll
          </Link>
          <button className="p-2 text-gray-600">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
