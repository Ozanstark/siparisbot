"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Phone, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setLoading(false)
      } else {
        router.push("/customer/bots") // Default redirect, middleware handles role
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <span className="bg-primary/10 p-2 rounded-xl text-primary">
                <Phone className="h-6 w-6" />
              </span>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                RezonAll
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-gray-500">
              Sign in to manage your voice agents
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            Powered by RezonAll AI Voice Technology
          </div>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-900 to-gray-900 animate-gradient" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-2xl max-w-lg shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">
              Next Generation Voice AI
            </h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              Deploy intelligent voice agents that sound human, handle complex tasks, and scale infinitely. Manage your entire voice infrastructure from one beautiful dashboard.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Operational
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div>version 2.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
