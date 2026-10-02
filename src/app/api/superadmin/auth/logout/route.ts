import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const res = await fetch(`${API_URL}/api/superadmin/auth/logout`, {
      method: "POST",
      headers: { cookie },
    })

    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })

    const setCookie = res.headers.get("set-cookie")
    if (setCookie) {
      response.headers.set("set-cookie", setCookie)
    }

    return response
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
