import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const { searchParams } = new URL(req.url)
    const queryString = searchParams.toString()
    const url = `${API_URL}/api/activity${queryString ? `?${queryString}` : ""}`
    
    const res = await fetch(url, { headers: { cookie } })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch activity" }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
}