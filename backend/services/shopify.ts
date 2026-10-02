import { config } from "../config"

interface ShopifyProduct {
  id: number
  title: string
  status: string
  variants: Array<{ id: number; price: string; inventory_quantity: number }>
}

interface ShopifyOrder {
  id: number
  name: string
  order_number: number
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  email: string
  created_at: string
  customer: { email: string; first_name: string; last_name: string } | null
  line_items: Array<{ id: number; title: string; quantity: number; price: string; sku?: string }>
}

interface ShopifyShop {
  id: number
  name: string
  email: string
  domain: string
  currency: string
  timezone: string
  iana_timezone: string
  country_code: string
  province_code: string
  address1: string
  city: string
  zip: string
  phone: string
  primary_domain: { host: string }
}

interface ShopifyPolicies {
  shipping_policy?: { body: string; title: string }
  refund_policy?: { body: string; title: string }
  privacy_policy?: { body: string; title: string }
  terms_of_service?: { body: string; title: string }
}

export class ShopifyService {
  private baseUrl: string
  private accessToken: string

  constructor(shopDomain: string, accessToken: string) {
    this.baseUrl = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}`
    this.accessToken = accessToken
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async getProducts(limit = 50): Promise<ShopifyProduct[]> {
    const data = await this.request<{ products: ShopifyProduct[] }>(
      `/products.json?limit=${limit}&status=active`
    )
    return data.products
  }

  async getOrders(limit = 50, status?: string): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (status) params.set("status", status)

    const data = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?${params.toString()}`
    )
    return data.orders
  }

  async getOrderById(orderId: number): Promise<ShopifyOrder | null> {
    try {
      const data = await this.request<{ order: ShopifyOrder }>(`/orders/${orderId}.json`)
      return data.order
    } catch {
      return null
    }
  }

  async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.request<T>("/graphql.json", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    })
  }

  async updateProduct(productId: number, data: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const result = await this.request<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      {
        method: "PUT",
        body: JSON.stringify({ product: data }),
      }
    )
    return result.product
  }

  async addOrderTags(orderId: number, tags: string[]): Promise<{ success: boolean; errors?: string[] }> {
    const mutation = `
      mutation addTags($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors { message }
        }
      }
    `
    const result = await this.graphql<{ tagsAdd: { userErrors: Array<{ message: string }> } }>(mutation, {
      id: `gid://shopify/Order/${orderId}`,
      tags,
    })
    const errors = result.tagsAdd?.userErrors || []
    return { success: errors.length === 0, errors: errors.map(e => e.message) }
  }

  async refundOrder(orderId: number, amount?: string, reason?: string): Promise<{ success: boolean; refund?: any; error?: string }> {
    try {
      const data = await this.request<{ refund: any }>(
        `/orders/${orderId}/refunds.json`,
        {
          method: "POST",
          body: JSON.stringify({
            refund: {
              note: reason || "Refund processed by Quilo",
              notify: true,
              ...(amount ? { shipping: { full_refund: false } } : {}),
            },
          }),
        }
      )
      return { success: true, refund: data.refund }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async partialRefund(
    orderId: number,
    lineItems: Array<{ itemId: number; quantity: number; amount?: string }>,
    reason?: string
  ): Promise<{ success: boolean; refund?: any; error?: string }> {
    try {
      const data = await this.request<{ refund: any }>(
        `/orders/${orderId}/refunds.json`,
        {
          method: "POST",
          body: JSON.stringify({
            refund: {
              note: reason || "Partial refund processed by Quilo",
              notify: true,
              shipping: { full_refund: false },
              refund_line_items: lineItems.map(item => ({
                line_item_id: item.itemId,
                quantity: item.quantity,
                price: item.amount || "0",
              })),
            },
          }),
        }
      )
      return { success: true, refund: data.refund }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async verifyRefund(orderId: number, refundId?: number): Promise<{ verified: boolean; status?: string }> {
    try {
      const order = await this.getOrderById(orderId)
      if (!order) return { verified: false }
      return { verified: true, status: order.financial_status }
    } catch {
      return { verified: false }
    }
  }

  async verifyOrderTag(orderId: number, tag: string): Promise<{ tagged: boolean }> {
    try {
      const order = await this.getOrderById(orderId)
      if (!order) return { tagged: false }
      const orderTags = (order as any).tags || ""
      return { tagged: orderTags.includes(tag) }
    } catch {
      return { tagged: false }
    }
  }

  async addOrderNote(orderId: number, note: string): Promise<void> {
    await this.request(`/orders/${orderId}.json`, {
      method: "PUT",
      body: JSON.stringify({
        order: { note },
      }),
    })
  }

  async fulfillOrder(orderId: number, lineItems: Array<{ id: number; quantity: number }>): Promise<{ success: boolean; fulfillment?: any; error?: string }> {
    try {
      const data = await this.request<{ fulfillment: any }>(
        `/orders/${orderId}/fulfillments.json`,
        {
          method: "POST",
          body: JSON.stringify({
            fulfillment: {
              line_items: lineItems,
              notify_customer: true,
            },
          }),
        }
      )
      return { success: true, fulfillment: data.fulfillment }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async getShop(): Promise<ShopifyShop | null> {
    try {
      const data = await this.request<{ shop: ShopifyShop }>(`/shop.json`)
      return data.shop
    } catch {
      return null
    }
  }

  async getPolicies(): Promise<ShopifyPolicies> {
    try {
      const data = await this.request<{ policies: ShopifyPolicies }>(`/policies.json`)
      return data.policies || {}
    } catch {
      return {}
    }
  }

  async findByOrderNumber(orderNumber: string): Promise<ShopifyOrder | null> {
    try {
      const cleaned = orderNumber.replace(/^#/, "")
      const data = await this.request<{ orders: ShopifyOrder[] }>(
        `/orders.json?name=${encodeURIComponent("#" + cleaned)}&status=any&limit=1`
      )
      return data.orders?.[0] || null
    } catch {
      return null
    }
  }

  async findByCustomerEmail(email: string): Promise<ShopifyOrder[]> {
    try {
      const data = await this.request<{ orders: ShopifyOrder[] }>(
        `/orders.json?email=${encodeURIComponent(email)}&status=any&limit=20`
      )
      return data.orders || []
    } catch {
      return []
    }
  }
}
