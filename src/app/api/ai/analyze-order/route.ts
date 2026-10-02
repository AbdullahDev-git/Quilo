import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cookies = req.headers.get("cookie") || ""

    const res = await fetch(`${API_URL}/api/ai/analyze-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
  }
}
