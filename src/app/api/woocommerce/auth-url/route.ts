import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storeUrl = searchParams.get("storeUrl")

  if (!storeUrl) {
    return NextResponse.json({ error: "storeUrl parameter is required" }, { status: 400 })
  }

  const cookie = req.headers.get("cookie") || ""

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/woocommerce/auth-url?storeUrl=${encodeURIComponent(storeUrl)}`,
      { headers: { cookie } }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to initiate WooCommerce connection" },
        { status: response.status }
      )
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error("WooCommerce auth-url proxy error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 500 })
  }
}
