import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const shop = searchParams.get("shop")

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 })
  }

  // Get cookies from the original request to pass auth
  const cookie = req.headers.get("cookie") || ""

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/shopify?shop=${encodeURIComponent(shop)}`, {
      headers: { cookie },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Failed to initiate Shopify OAuth" }, { status: response.status })
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error("Shopify auth proxy error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 500 })
  }
}
