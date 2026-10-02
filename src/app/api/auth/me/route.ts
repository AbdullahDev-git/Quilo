import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")

    if (!session) {
      return NextResponse.json({ user: null })
    }

    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: `session=${session.value}` },
    })

    if (!res.ok) {
      return NextResponse.json({ user: null })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ user: null })
  }
}
