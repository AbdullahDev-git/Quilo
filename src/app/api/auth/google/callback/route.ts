import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", req.url))
  }

  return NextResponse.redirect(new URL("/dashboard", req.url))
}
