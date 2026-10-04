import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "woocommerce" })

interface WooCommerceConfig {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

// Pending OAuth connections — in-memory with TTL
// Production: move to Redis/DB for multi-instance deployments
interface PendingConnection {
  userId: string
  storeUrl: string
  expiresAt: number
}

const pendingConnections = new Map<string, PendingConnection>()
const PENDING_TTL = 15 * 60 * 1000 // 15 minutes

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, conn] of pendingConnections) {
    if (conn.expiresAt < now) pendingConnections.delete(key)
  }
}, 60 * 1000)

export function createPendingConnection(userId: string, storeUrl: string): string {
  const token = crypto.randomUUID()
  pendingConnections.set(token, {
    userId,
    storeUrl: normalizeStoreUrl(storeUrl),
    expiresAt: Date.now() + PENDING_TTL,
  })
  return token
}

export function consumePendingConnection(token: string): PendingConnection | null {
  const conn = pendingConnections.get(token)
  if (!conn) return null
  if (conn.expiresAt < Date.now()) {
    pendingConnections.delete(token)
    return null
  }
  pendingConnections.delete(token) // one-time use
  return conn
}

export function normalizeStoreUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "")
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`
  }
  return normalized
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

  // Validate credentials by making a test API call
  async validate(): Promise<boolean> {
    try {
      await this.getProducts(1)
      return true
    } catch {
      return false
    }
  }
}

export function createWooCommerceService(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): WooCommerceService {
  return new WooCommerceService({ storeUrl, consumerKey, consumerSecret })
}

export function getAuthUrl(storeUrl: string, callbackUrl: string, returnUrl: string, stateToken: string): string {
  const normalized = normalizeStoreUrl(storeUrl)
  const url = new URL(`${normalized}/wc-auth/v1/authorize`)
  url.searchParams.set("app_name", config.woocommerce.appName)
  url.searchParams.set("scope", config.woocommerce.scope)
  url.searchParams.set("user_id", "quilo-app")
  url.searchParams.set("return_url", `${returnUrl}?connected=woocommerce&state=${stateToken}`)
  url.searchParams.set("callback_url", `${callbackUrl}?state=${stateToken}`)
  return url.toString()
}

export interface WooAuthCallbackData {
  key: string
  secret: string
  status: string
  message: string
  store_url: string
  state?: string
}

export function parseAuthCallback(body: any, query: any): WooAuthCallbackData | null {
  if (!body || !body.key || !body.secret || !body.store_url) {
    return null
  }
  return {
    key: String(body.key),
    secret: String(body.secret),
    status: String(body.status || ""),
    message: String(body.message || ""),
    store_url: normalizeStoreUrl(String(body.store_url)),
    state: query?.state ? String(query.state) : undefined,
  }
}
