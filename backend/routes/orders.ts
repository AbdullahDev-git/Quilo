import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { ShopifyService } from "../services/shopify"
import { validate, syncOrdersSchema, updateOrderStatusSchema, partialRefundSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "orders" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userOrders = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.userId, req.userId!))
      .orderBy(orders.createdAt)

    return res.json(userOrders)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch orders")
    return res.status(500).json({ error: "Failed to fetch orders" })
  }
})

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const [order] = await getDb()
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))
      .limit(1)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.json(order)
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to fetch order")
    return res.status(500).json({ error: "Failed to fetch order" })
  }
})

// Step 10: Partial refund endpoint
router.post("/:id/partial-refund", validate(partialRefundSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { lineItems, reason } = req.body

    const [order] = await getDb()
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))
      .limit(1)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    if (!order.storeId) {
      return res.status(400).json({ error: "Order not connected to a store" })
    }

    const [store] = await getDb().select().from(stores).where(eq(stores.id, order.storeId)).limit(1)
    if (!store?.accessToken || !store?.domain) {
      return res.status(400).json({ error: "Store not connected to Shopify" })
    }

    const shopify = new ShopifyService(store.domain, store.accessToken)
    const refundResult = await shopify.partialRefund(
      Number(order.orderId),
      lineItems,
      reason || "Partial refund via Quilo"
    )

    if (!refundResult.success) {
      return res.status(400).json({ error: "Partial refund failed", details: refundResult.error })
    }

    // Update order status
    await getDb()
      .update(orders)
      .set({
        returnStatus: "approved",
        status: "partially_refunded",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))

    log.info({ orderId: order.orderId, lineItems: lineItems.length }, "Partial refund processed")
    return res.json({ success: true, refund: refundResult.refund })
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to process partial refund")
    return res.status(500).json({ error: "Failed to process partial refund" })
  }
})

router.post("/sync", validate(syncOrdersSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.body

    const [store] = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const shopify = new ShopifyService(store.domain, store.accessToken)
    const shopifyOrders = await shopify.getOrders(50)

    const db = getDb()
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
        .where(and(eq(orders.orderId, String(shopifyOrder.id)), eq(orders.userId, req.userId!)))
        .limit(1)

      if (!existing) {
        await db.insert(orders).values({
          userId: req.userId!,
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

    log.info({ storeId, userId: req.userId, synced: syncedCount }, "Orders synced")
    return res.json({ synced: syncedCount })
  } catch (error) {
    log.error({ err: error, storeId: req.body.storeId }, "Order sync failed")
    return res.status(500).json({ error: "Order sync failed" })
  }
})

router.put("/:id/status", validate(updateOrderStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, returnStatus, returnReason } = req.body

    await getDb()
      .update(orders)
      .set({
        ...(status && { status }),
        ...(returnStatus && { returnStatus }),
        ...(returnReason !== undefined && { returnReason }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))

    const [order] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, req.userId!))).limit(1)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    log.info({ orderId: id, status, returnStatus }, "Order status updated")
    return res.json(order)
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to update order")
    return res.status(500).json({ error: "Failed to update order" })
  }
})

export default router

