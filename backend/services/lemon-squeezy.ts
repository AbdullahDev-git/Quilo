import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "lemon-squeezy" })

const LS_API_BASE = "https://api.lemonsqueezy.com/v1"

interface LemonSqueezyConfig {
  apiKey: string
  storeId: string
}

export class LemonSqueezyService {
  private apiKey: string
  private storeId: string

 constructor(lsConfig: LemonSqueezyConfig) {
    this.apiKey = lsConfig.apiKey
    this.storeId = lsConfig.storeId
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${LS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Lemon Squeezy API error: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    return response.json()
  }

  async createCheckout(
    variantId: number,
    customData: Record<string, any>,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ data: { attributes: { url: string; id: string } } }> {
    return this.request("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: { custom: customData },
            product_options: {
              redirect_url: successUrl,
              cancel_url: cancelUrl,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: String(this.storeId) } },
            variant: { data: { type: "variants", id: String(variantId) } },
          },
        },
      }),
    })
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    return this.request(`/subscriptions/${subscriptionId}`)
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    return this.request(`/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: { cancelled: true },
        },
      }),
    })
  }

  async listProducts(): Promise<any> {
    return this.request(`/products?filter[store_id]=${this.storeId}`)
  }

  async listVariants(productId: number): Promise<any> {
    return this.request(`/products/${productId}/variants`)
  }

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require("crypto")
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(body)
    const digest = hmac.digest("hex")
    return digest === signature
  }
}

export function createLemonSqueezyService(): LemonSqueezyService | null {
  const apiKey = config.lemonSqueezy.apiKey
  const storeId = config.lemonSqueezy.storeId

  if (!apiKey || !storeId) {
    log.warn("Lemon Squeezy not configured. Set LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID.")
    return null
  }

  return new LemonSqueezyService({ apiKey, storeId })
}
