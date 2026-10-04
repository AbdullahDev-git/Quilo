import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/portal/${storeId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to submit return request" }, { status: 500 })
  }
}
