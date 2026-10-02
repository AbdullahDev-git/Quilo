import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { cookie },
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set("session", "", { maxAge: 0, path: "/" })
    return response
  } catch {
    return NextResponse.json({ success: true })
  }
}
