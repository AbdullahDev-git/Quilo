import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/users/me`, { headers: { cookie } })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch user" }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}