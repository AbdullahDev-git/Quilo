import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.text()

    // Forward to Express backend for processing
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"
    const res = await fetch(`${API_URL}/api/webhooks/lemon-squeezy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": req.headers.get("x-signature") || "",
      },
      body,
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Lemon Squeezy webhook proxy error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
