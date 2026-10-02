import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const url = new URL(req.url)
    const path = url.pathname.split("/").pop() || ""
    const params = url.searchParams.toString()

    const res = await fetch(`${API_URL}/api/superadmin/support/${path}?${params}`, {
      headers: { cookie },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const url = new URL(req.url)
    const path = url.pathname.split("/").pop() || ""
    const body = await req.json()

    const res = await fetch(`${API_URL}/api/superadmin/support/${path}`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const action = segments.pop()
    const id = segments.pop()
    const body = await req.json()

    const endpoint = action === "respond" || action === "close"
      ? `${API_URL}/api/superadmin/support/tickets/${id}/${action}`
      : `${API_URL}/api/superadmin/support/features/${id}`

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || ""
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments.pop()
    const type = segments.pop()

    const res = await fetch(`${API_URL}/api/superadmin/support/${type}/${id}`, {
      method: "DELETE",
      headers: { cookie },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
