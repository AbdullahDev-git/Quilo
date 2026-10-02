import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    const response = NextResponse.json(data, { status: 201 })
    const setCookie = res.headers.get("set-cookie")
    if (setCookie) {
      response.headers.set("set-cookie", setCookie)
    }

    return response
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}
