import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const { type } = await params
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/integrations/${type}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to connect integration" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const { type } = await params
    const res = await fetch(`${API_URL}/api/integrations/${type}`, {
      method: "DELETE",
      headers: { cookie },
    })
    if (!res.ok) {
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to disconnect integration" }, { status: 500 })
  }
}