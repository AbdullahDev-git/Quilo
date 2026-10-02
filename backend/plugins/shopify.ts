import { config } from "../config"

export function getShopifyAuthUrl(shop: string, state: string): string {
  const redirectUri = `${config.shopify.appUrl}/api/auth/shopify/callback`

  const params = new URLSearchParams({
    client_id: config.shopify.clientId,
    scope: [
      "read_products", "write_products",
      "read_orders", "write_orders",
      "read_customers", "write_customers",
      "read_inventory", "write_inventory",
      "read_fulfillments", "write_fulfillments",
    ].join(","),
    redirect_uri: redirectUri,
    state,
  })

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export async function getAccessToken(shop: string, code: string): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.shopify.clientId,
      client_secret: config.shopify.clientSecret,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

export function verifyWebhook(body: string, hmac: string): boolean {
  const crypto = require("crypto")
  const hash = crypto
    .createHmac("sha256", config.shopify.clientSecret)
    .update(body, "utf8")
    .digest("base64")

  return hash === hmac
}
