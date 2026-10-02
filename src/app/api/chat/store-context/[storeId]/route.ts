import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params
    const res = await fetch(`${API_URL}/api/chat/store-context/${storeId}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to get store context" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/chat/store-context/${storeId}/refresh`, {
      method: "POST",
      headers: { cookie },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to refresh store context" }, { status: 500 })
  }
}
