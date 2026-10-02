import { Request, Response } from "express"
import { ShopifyService } from "../services/shopify"
import { getDb } from "../config/database"
import { stores, rules, orders } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { RulesEngine } from "../services/rules-engine"
import { AuthRequest } from "../middleware/auth"
import { verifyWebhook } from "../plugins/shopify"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "shopify-webhook" })

function extractConditionData(eventData: any, topic: string): Record<string, any> {
  if (topic === "orders/create" || topic === "orders/updated") {
    return {
      orderId: eventData.id,
      orderNumber: eventData.order_number,
      amount: parseFloat(eventData.total_price || "0"),
      subtotal: parseFloat(eventData.subtotal_price || "0"),
      totalDiscount: parseFloat(eventData.total_discounts || "0"),
      shipping: parseFloat(eventData.shipping_lines?.[0]?.price || "0"),
      currency: eventData.currency,
      financialStatus: eventData.financial_status,
      fulfillmentStatus: eventData.fulfillment_status,
      customerEmail: eventData.email || eventData.customer?.email,
      customerName: eventData.customer ? `${eventData.customer.first_name} ${eventData.customer.last_name}`.trim() : "",
      customerTier: eventData.customer?.note ? "vip" : "standard",
      lineItems: eventData.line_items || [],
      itemCount: eventData.line_items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0,
      tags: eventData.tags || "",
      note: eventData.note || "",
      billingCountry: eventData.billing_address?.country || "",
      shippingCountry: eventData.shipping_address?.country || "",
      createdAt: eventData.created_at,
      // Step 9: Return Reason Collection - extract from note, tags, or customer note
      returnReason: eventData.note || eventData.tags?.match(/return[_-]?(reason|code)[: ]+([^\n,]+)/i)?.[2] || "",
      reason: eventData.note || "",
      order_age_days: 0,
      in_stock: true,
      return_count_30d: 0,
      has_receipt: true,
    }
  }

  if (topic === "refunds/create") {
    return {
      orderId: eventData.order_id,
      amount: parseFloat(eventData.total_refunded || "0"),
      reason: eventData.note || "",
      returnReason: eventData.note || "",
      createdAt: eventData.created_at,
      order_age_days: 0,
      in_stock: true,
      return_count_30d: 0,
      has_receipt: true,
    }
  }

  // Step 9: Return Reason Collection - handle returns/create topic
  if (topic === "returns/create" || topic === "returns/update") {
    return {
      orderId: eventData.order_id || eventData.order?.id,
      amount: parseFloat(eventData.total_refunded || eventData.order?.total_price || "0"),
      reason: eventData.reason || eventData.note || "",
      returnReason: eventData.reason || eventData.note || "",
      createdAt: eventData.created_at,
      order_age_days: 0,
      in_stock: true,
      return_count_30d: 0,
      has_receipt: true,
    }
  }

  return {
    orderId: eventData.id || eventData.order_id,
    amount: parseFloat(eventData.total_price || eventData.total_refunded || "0"),
    topic,
    createdAt: eventData.created_at,
    returnReason: eventData.note || "",
    order_age_days: 0,
    in_stock: true,
    return_count_30d: 0,
    has_receipt: true,
  }
}

export async function handleShopifyWebhook(req: Request, res: Response) {
  const topic = req.headers["x-shopify-topic"] as string
  const shopDomain = req.headers["x-shopify-shop-domain"] as string
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string
  const eventData = req.body

  // Verify HMAC signature
  if (hmacHeader) {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body)
    if (!verifyWebhook(rawBody, hmacHeader)) {
      console.error(`Shopify webhook HMAC verification failed for ${shopDomain}`)
      return res.status(401).json({ error: "Invalid webhook signature" })
    }
  }

  try {
    const db = getDb()
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.domain, shopDomain))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const activeRules = await db
      .select()
      .from(rules)
      .where(and(eq(rules.storeId, store.id), eq(rules.status, "active")))
      .orderBy(rules.priority)

    if (activeRules.length > 0) {
      const shopifyService = new ShopifyService(store.domain, store.accessToken)
      const engine = new RulesEngine(shopifyService, store.userId, store.id)
      const conditionData = extractConditionData(eventData, topic)

      // Step 2: Conflict Resolution - only execute the highest-priority matching rule
      let ruleExecuted = false
      for (const rule of activeRules) {
        const triggered = engine.evaluate(rule.conditions as any[], conditionData, (rule.logic as "all" | "any") || "all")
        if (triggered) {
          log.info({ ruleName: rule.name, priority: rule.priority, orderId: conditionData.orderId }, "Rule triggered")
          await engine.executeWithAI(
            {
              id: rule.id,
              name: rule.name,
              description: rule.description || "",
              conditions: rule.conditions as any[],
              actions: rule.actions as any[],
            },
            conditionData
          )
          await db.update(rules)
            .set({
              triggerCount: (rule.triggerCount || 0) + 1,
              lastTriggeredAt: new Date().toISOString(),
            })
            .where(eq(rules.id, rule.id))
          ruleExecuted = true
          break // Conflict resolution: stop after first matching rule
        }
      }
      if (!ruleExecuted) {
        log.info({ orderId: conditionData.orderId, topic }, "No matching rule found")
      }
    }

    return res.json({ received: true })
  } catch (error) {
    log.error({ err: error, shopDomain, topic }, "Webhook processing failed")
    return res.status(500).json({ error: "Webhook processing failed" })
  }
}

export async function syncOrders(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    const userId = (req as AuthRequest).userId

    const db = getDb()
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const shopify = new ShopifyService(store.domain, store.accessToken)
    const shopifyOrders = await shopify.getOrders(50)

    let syncedCount = 0

    for (const shopifyOrder of shopifyOrders) {
      const lineItems = shopifyOrder.line_items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
      })) || []

      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderId, String(shopifyOrder.id)), eq(orders.userId, userId!)))
        .limit(1)

      if (!existing) {
        await db.insert(orders).values({
          userId: userId!,
          storeId,
          orderId: String(shopifyOrder.id),
          orderNumber: shopifyOrder.name,
          customerEmail: shopifyOrder.email || shopifyOrder.customer?.email,
          customerName: shopifyOrder.customer
            ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`.trim()
            : "",
          totalAmount: shopifyOrder.total_price || "0",
          currency: shopifyOrder.currency || "USD",
          status: shopifyOrder.financial_status || "pending",
          financialStatus: shopifyOrder.financial_status,
          fulfillmentStatus: shopifyOrder.fulfillment_status,
          lineItems: JSON.stringify(lineItems),
          returnReason: "",
          returnStatus: "pending",
          isFraud: "false",
          createdAt: shopifyOrder.created_at || new Date().toISOString(),
        })
        syncedCount++
      } else {
        await db.update(orders)
          .set({
            financialStatus: shopifyOrder.financial_status,
            fulfillmentStatus: shopifyOrder.fulfillment_status,
            status: shopifyOrder.financial_status || "pending",
          })
          .where(eq(orders.id, existing.id))
      }
    }

    log.info({ storeId, userId, synced: syncedCount }, "Orders synced")
    return res.json({ synced: syncedCount })
  } catch (error) {
    log.error({ err: error, storeId }, "Order sync failed")
    return res.status(500).json({ error: "Order sync failed" })
  }
}
