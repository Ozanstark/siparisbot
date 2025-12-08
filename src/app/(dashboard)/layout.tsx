import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Phone,
  FileText,
  Settings,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  Building,
  Calendar,
  Sparkles
} from "lucide-react"

export const dynamic = "force-dynamic"

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

  const commonNavigation = [
    { name: 'Asistanlar', href: `${basePath}/bots`, icon: LayoutDashboard },
    { name: 'Görüşmeler', href: `${basePath}/calls`, icon: Phone },
    { name: 'Bilgi Bankası', href: `${basePath}/knowledge-bases`, icon: BookOpen },
  ]

  const customerType = session.user.customerType || "RESTAURANT"

  const customerNavigation = [
    ...(customerType === "RESTAURANT"
      ? [{ name: 'Siparişler', href: `${basePath}/orders`, icon: FileText }]
      : [
        { name: 'Odalar', href: `${basePath}/rooms`, icon: Building },
        { name: 'Rezervasyonlar', href: `${basePath}/reservations`, icon: Calendar }
      ])
  ]

  const adminNavigation = [
    { name: 'Müşteriler', href: `${basePath}/customers`, icon: Users },
    { name: 'Telefon Numaraları', href: `${basePath}/phone-numbers`, icon: Phone },
    { name: 'Ayarlar', href: `${basePath}/settings`, icon: Settings },
  ]

  const navItems = isAdmin
    ? [...commonNavigation, ...adminNavigation]
    : [...commonNavigation, ...customerNavigation]

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black/90 flex relative overflow-hidden">
      {/* Background Grid Pattern - Separated to avoid masking content */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0" />

      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] -z-10" />

      {/* Sidebar - Floating Glass Design */}
      <aside className="hidden md:flex flex-col w-72 m-4 rounded-3xl glass border border-white/20 dark:border-white/10 shadow-2xl z-50">
        {/* Logo */}
        <div className="h-20 flex items-center px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <span className="relative bg-gradient-to-tr from-primary to-purple-600 p-2.5 rounded-xl text-white block shadow-lg shadow-primary/20">
                <Phone className="h-5 w-5" />
              </span>
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              RezonAll
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-4 select-none">
            Platform
          </div>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-all duration-300 group hover:shadow-sm"
            >
              <item.icon className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
              {item.name}
              <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                <Sparkles className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100/50 dark:border-white/5">
          <div className="glass-card rounded-2xl p-3 mb-2 group cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/50 dark:ring-white/10 shadow-lg">
                {session.user.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Güvenli Çıkış
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:pr-4 md:py-4 relative z-10">
        {/* Mobile Header */}
        <header className="h-16 md:hidden flex items-center justify-between px-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b sticky top-0 z-40">
          <Link href="/" className="font-bold text-lg text-primary flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            RezonAll
          </Link>
          <button className="p-2 text-gray-600 dark:text-gray-300">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Page Content Container - Rounded & Glassy */}
        <main className="flex-1 glass md:rounded-3xl border border-white/20 dark:border-white/10 overflow-hidden relative shadow-2xl flex flex-col">
          <div className="flex-1 overflow-auto p-6 md:p-10 scrollbar-hide">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
