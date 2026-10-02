import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/superadmin/dashboard`, {
      headers: { cookie },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}
