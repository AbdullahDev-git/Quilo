import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "woocommerce" })

interface WooCommerceConfig {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

export class WooCommerceService {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string

  constructor(wooConfig: WooCommerceConfig) {
    this.baseUrl = `${wooConfig.storeUrl}/wp-json/wc/v3`
    this.consumerKey = wooConfig.consumerKey
    this.consumerSecret = wooConfig.consumerSecret
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.set("consumer_key", this.consumerKey)
    url.searchParams.set("consumer_secret", this.consumerSecret)

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getProducts(limit = 50): Promise<any[]> {
    return this.request(`/products?per_page=${limit}`)
  }

  async getOrders(limit = 50, status?: string): Promise<any[]> {
    const params = new URLSearchParams({ per_page: String(limit) })
    if (status) params.set("status", status)
    return this.request(`/orders?${params.toString()}`)
  }

  async getOrder(orderId: number): Promise<any> {
    return this.request(`/orders/${orderId}`)
  }

  async updateOrder(orderId: number, data: Record<string, any>): Promise<any> {
    return this.request(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async createRefund(orderId: number, amount: string, reason?: string): Promise<any> {
    return this.request(`/orders/${orderId}/refunds`, {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    })
  }

  async addOrderNote(orderId: number, note: string): Promise<any> {
    return this.request(`/orders/${orderId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    })
  }
}

export function createWooCommerceService(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): WooCommerceService {
  return new WooCommerceService({ storeUrl, consumerKey, consumerSecret })
}

export function getAuthUrl(storeUrl: string, redirectUri: string): string {
  const url = new URL(`${storeUrl}/wc-auth/v1/authorize`)
  url.searchParams.set("app_name", "Quilo - Returns Automation")
  url.searchParams.set("scope", "read_write")
  url.searchParams.set("user_id", "{{user_id}}")
  url.searchParams.set("return_url", redirectUri)
  url.searchParams.set("callback_url", redirectUri)
  return url.toString()
}

export async function handleOAuthCallback(
  storeUrl: string,
  code: string
): Promise<{ consumerKey: string; consumerSecret: string }> {
  log.info({ storeUrl }, "WooCommerce OAuth callback received")

  // WooCommerce Application Authentication flow:
  // The store owner approves on their WordPress site,
  // and the consumer key/secret are returned via the callback URL.
  // In production, parse these from the callback query params.
  throw new Error("WooCommerce OAuth callback not yet implemented")
}
