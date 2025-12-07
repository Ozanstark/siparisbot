import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin-only routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/customer/dashboard", req.url))
    }

    // Customer routes
    if (path.startsWith("/customer") && token?.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
    "/api/bots/:path*",
    "/api/calls/:path*",
    "/api/numbers/:path*",
    "/api/analytics/:path*",
  ],
}
