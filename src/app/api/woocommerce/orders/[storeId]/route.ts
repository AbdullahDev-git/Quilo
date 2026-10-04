import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params
  const cookie = req.headers.get("cookie") || ""

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/woocommerce/orders/${storeId}`,
      { headers: { cookie } }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch orders" },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("WooCommerce orders proxy error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 500 })
  }
}
