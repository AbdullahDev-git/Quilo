import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function PUT(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const { storeId } = await params
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/spend-caps/${storeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to update spend cap" }, { status: 500 })
  }
}