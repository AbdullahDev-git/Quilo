import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: NextRequest) {
  try {
    const cookies = req.headers.get("cookie") || ""

    const res = await fetch(`${API_URL}/api/ai/suggest-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
  }
}
