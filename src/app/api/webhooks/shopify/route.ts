import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(req: Request) {
  const headersList = await headers()
  const topic = headersList.get("x-shopify-topic")
  const shopDomain = headersList.get("x-shopify-shop-domain")
  const hmac = headersList.get("x-shopify-hmac-sha256")

  try {
    const body = await req.json()

    console.log(`Webhook received: ${topic} from ${shopDomain}`)

    // TODO: Verify HMAC signature
    // TODO: Process webhook and trigger rules
    // TODO: Log to audit table

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
