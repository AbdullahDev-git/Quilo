import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/webhooks`, { headers: { cookie } })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 })
  }
}