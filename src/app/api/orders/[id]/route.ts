import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/orders/${id}`, { headers: { cookie } })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch order" }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}