import { ShopifyService } from "./shopify"
import { WooCommerceService } from "./woocommerce"
import { getDb } from "../config/database"
import { stores, rules } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "store-context" })

export interface StoreContext {
  storeId: string
  storeName: string
  domain: string
  platform: string
  shop: {
    name?: string
    email?: string
    currency?: string
    timezone?: string
    country?: string
  } | null
  policies: {
    refund?: string
    shipping?: string
    privacy?: string
    terms?: string
  }
  products: Array<{
    id: string
    title: string
    price: string
    inStock: boolean
  }>
  rules: Array<{
    name: string
    description: string
    conditions: any[]
    actions: any[]
  }>
  recentOrderCount: number
  returnPolicySummary: string
  fetchedAt: string
}

// Cache store contexts for 5 minutes to avoid repeated API calls
const contextCache = new Map<string, { context: StoreContext; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getStoreContext(storeId: string): Promise<StoreContext | null> {
  // Check cache first
  const cached = contextCache.get(storeId)
  if (cached && cached.expires > Date.now()) {
    return cached.context
  }

  try {
    const db = getDb()
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store) {
      log.warn({ storeId }, "Store not found for context")
      return null
    }

    // Fetch store rules (as policy proxy)
    const storeRules = await db
      .select()
      .from(rules)
      .where(eq(rules.storeId, storeId))
      .limit(20)

    // Build context based on platform
    let shop: StoreContext["shop"] = null
    let policies: StoreContext["policies"] = {}
    let products: StoreContext["products"] = []

    if (store.platform === "shopify") {
      const shopify = new ShopifyService(store.domain, store.accessToken)

      // Fetch shop info
      const shopInfo = await shopify.getShop()
      if (shopInfo) {
        shop = {
          name: shopInfo.name,
          email: shopInfo.email,
          currency: shopInfo.currency,
          timezone: shopInfo.timezone,
          country: shopInfo.country_code,
        }
      }

      // Fetch policies
      const shopifyPolicies = await shopify.getPolicies()
      if (shopifyPolicies.refund_policy?.body) {
        policies.refund = shopifyPolicies.refund_policy.body
      }
      if (shopifyPolicies.shipping_policy?.body) {
        policies.shipping = shopifyPolicies.shipping_policy.body
      }
      if (shopifyPolicies.privacy_policy?.body) {
        policies.privacy = shopifyPolicies.privacy_policy.body
      }
      if (shopifyPolicies.terms_of_service?.body) {
        policies.terms = shopifyPolicies.terms_of_service.body
      }

      // Fetch products
      try {
        const shopifyProducts = await shopify.getProducts(30)
        products = shopifyProducts.map(p => ({
          id: String(p.id),
          title: p.title,
          price: p.variants?.[0]?.price || "0",
          inStock: (p.variants?.[0]?.inventory_quantity || 0) > 0,
        }))
      } catch (err) {
        log.warn({ storeId, err }, "Failed to fetch products")
      }
    } else if (store.platform === "woocommerce") {
      // WooCommerce context
      const [key, secret] = store.accessToken.split(":")
      if (key && secret) {
        try {
          const woo = new WooCommerceService({
            storeUrl: store.domain,
            consumerKey: key,
            consumerSecret: secret,
          })
          const wooProducts = await woo.getProducts(30)
          products = wooProducts.map((p: any) => ({
            id: String(p.id),
            title: p.name,
            price: p.price || "0",
            inStock: p.stock_status === "instock",
          }))
        } catch (err) {
          log.warn({ storeId, err }, "Failed to fetch WooCommerce products")
        }
      }
    }

    // Generate return policy summary from rules
    const returnRules = storeRules.filter(r =>
      r.conditions?.some((c: any) => c.field === "reason" || c.field === "returnReason")
    )
    const returnPolicySummary = returnRules.length > 0
      ? `Store has ${returnRules.length} return policy rule(s): ${returnRules.map(r => r.name).join(", ")}`
      : "No specific return rules configured. Contact support for return assistance."

    const context: StoreContext = {
      storeId: store.id,
      storeName: store.name,
      domain: store.domain,
      platform: store.platform,
      shop,
      policies,
      products,
      rules: storeRules.map(r => ({
        name: r.name,
        description: r.description || "",
        conditions: r.conditions as any[],
        actions: r.actions as any[],
      })),
      recentOrderCount: 0,
      returnPolicySummary,
      fetchedAt: new Date().toISOString(),
    }

    // Cache the context
    contextCache.set(storeId, {
      context,
      expires: Date.now() + CACHE_TTL,
    })

    log.info({ storeId, products: products.length, rules: storeRules.length }, "Store context fetched")
    return context
  } catch (error) {
    log.error({ err: error, storeId }, "Failed to build store context")
    return null
  }
}

export function clearStoreContextCache(storeId?: string): void {
  if (storeId) {
    contextCache.delete(storeId)
  } else {
    contextCache.clear()
  }
}
