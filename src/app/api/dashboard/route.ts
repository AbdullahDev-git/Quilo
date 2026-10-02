import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/dashboard`, {
      headers: { cookie },
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return NextResponse.json({ error: body?.error || "Failed to fetch dashboard" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Backend server not reachable" }, { status: 502 })
  }
}