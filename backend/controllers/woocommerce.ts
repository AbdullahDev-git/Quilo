import { Response } from "express"
import { getDb } from "../config/database"
import { stores, orders } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { createWooCommerceService } from "../services/woocommerce"
import { AuthRequest } from "../middleware/auth"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "woocommerce-sync" })

export async function syncWooOrders(req: AuthRequest, res: Response) {
  try {
    const { storeId } = req.params
    const userId = req.userId

    const db = getDb()
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    if (store.platform !== "woocommerce") {
      return res.status(400).json({ error: "Store is not a WooCommerce store" })
    }

    const [consumerKey, consumerSecret] = store.accessToken.split(":")
    if (!consumerKey || !consumerSecret) {
      return res.status(400).json({ error: "Invalid WooCommerce credentials format" })
    }

    const woo = createWooCommerceService(store.domain, consumerKey, consumerSecret)
    const wooOrders = await woo.getOrders(50)

    let syncedCount = 0

    for (const wooOrder of wooOrders) {
      const lineItems = wooOrder.line_items?.map((item: any) => ({
        id: item.id,
        title: item.name || item.product_name,
        quantity: item.quantity,
        price: item.price || item.total,
        sku: item.sku,
      })) || []

      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderId, String(wooOrder.id)), eq(orders.userId, userId!)))
        .limit(1)

      if (!existing) {
        await db.insert(orders).values({
          userId: userId!,
          storeId,
          orderId: String(wooOrder.id),
          orderNumber: wooOrder.order_key || `#${wooOrder.id}`,
          customerEmail: wooOrder.billing?.email,
          customerName: [wooOrder.billing?.first_name, wooOrder.billing?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
          totalAmount: wooOrder.total || "0",
          currency: wooOrder.currency || "PKR",
          status: wooOrder.status || "pending",
          financialStatus: wooOrder.status,
          fulfillmentStatus: wooOrder.status === "completed" ? "fulfilled" : "unfulfilled",
          lineItems: JSON.stringify(lineItems),
          returnReason: "",
          returnStatus: "pending",
          isFraud: "false",
          createdAt: wooOrder.date_created || new Date().toISOString(),
        })
        syncedCount++
      } else {
        await db.update(orders)
          .set({
            financialStatus: wooOrder.status,
            fulfillmentStatus: wooOrder.status === "completed" ? "fulfilled" : "unfulfilled",
            status: wooOrder.status || "pending",
          })
          .where(eq(orders.id, existing.id))
      }
    }

    log.info({ storeId, userId, synced: syncedCount }, "WooCommerce orders synced")
    return res.json({ synced: syncedCount })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "WooCommerce order sync failed")
    return res.status(500).json({ error: "Order sync failed" })
  }
}
