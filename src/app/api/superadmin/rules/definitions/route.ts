import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/superadmin/rules/definitions`, {
      headers: { cookie },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch definitions" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const body = await req.json()
    const url = new URL(req.url)
    const id = url.pathname.split("/").slice(-2, -1)[0]

    const res = await fetch(`${API_URL}/api/superadmin/rules/definitions/${id}`, {
      method: "PUT",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to update definition" }, { status: 500 })
  }
}
