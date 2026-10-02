import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Paths that don't require authentication
const publicPaths = ["/superadmin/login"]

// Paths that are API calls (handled by backend middleware)
const apiPaths = ["/api/"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes (backend handles auth)
  if (apiPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow public superadmin paths (login page)
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // If already logged in and trying to access login, redirect to dashboard
    const session = request.cookies.get("superadmin_session")
    if (session) {
      return NextResponse.redirect(new URL("/superadmin", request.url))
    }
    return NextResponse.next()
  }

  // Protect superadmin routes
  if (pathname.startsWith("/superadmin")) {
    const session = request.cookies.get("superadmin_session")

    if (!session) {
      // No session - redirect to login
      const loginUrl = new URL("/superadmin/login", request.url)
      loginUrl.searchParams.set("from", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Session exists - let it through
    // Backend middleware will verify the token is still valid
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match superadmin paths
    "/superadmin/:path*",
    // Exclude static files and API routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
