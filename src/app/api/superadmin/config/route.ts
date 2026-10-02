import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const url = new URL(req.url)
    const params = url.searchParams.toString()

    const res = await fetch(`${API_URL}/api/superadmin/config?${params}`, {
      headers: { cookie },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const body = await req.json()

    const res = await fetch(`${API_URL}/api/superadmin/config`, {
      method: "PUT",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
