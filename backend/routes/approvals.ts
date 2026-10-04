import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { ShopifyService } from "../services/shopify"
import { createContextLogger } from "../config/logger"
import { checkRefundAllowed, recordRefund } from "../services/spend-caps"

const log = createContextLogger({ module: "approvals" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const pendingOrders = await getDb()
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, req.userId!),
          eq(orders.returnStatus, "pending"),
        )
      )
      .orderBy(orders.createdAt)

    const flaggedOrders = await getDb()
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, req.userId!),
          eq(orders.isFraud, "true"),
        )
      )
      .orderBy(orders.createdAt)

    return res.json({ pending: pendingOrders, flagged: flaggedOrders })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch approvals")
    return res.status(500).json({ error: "Failed to fetch approvals" })
  }
})

// Step 8: Approve = Actual Shopify Refund
router.post("/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const [order] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, req.userId!))).limit(1)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    const refundAmount = parseFloat(order.totalAmount) || 0

    // Spend cap check — runs on all refund paths including manual approval.
    // Manual approval from the queue is a human override, so we log the check
    // result but allow the refund to proceed regardless.
    let spendCapCheck: { allowed: boolean; remaining?: number; reason?: string } = { allowed: true }
    if (order.storeId && refundAmount > 0) {
      spendCapCheck = await checkRefundAllowed(req.userId!, order.storeId, refundAmount)
      if (!spendCapCheck.allowed) {
        log.warn(
          { orderId: id, userId: req.userId, amount: refundAmount, remaining: spendCapCheck.remaining },
          "Manual approval proceeding despite spend cap (human override)"
        )
      }
    }

    // Attempt real Shopify refund if store is connected
    let refundResult: { success: boolean; error?: string; refund?: any } = { success: false, error: "No Shopify connection" }
    if (order.storeId) {
      const [store] = await getDb().select().from(stores).where(eq(stores.id, order.storeId)).limit(1)
      if (store?.accessToken && store?.domain) {
        const shopify = new ShopifyService(store.domain, store.accessToken)
        refundResult = await shopify.refundOrder(
          Number(order.orderId),
          order.totalAmount,
          `Refund approved by merchant via Quilo (Order ${order.orderNumber || order.orderId})`
        )
        if (refundResult.success) {
          // Verify refund was processed
          const verify = await shopify.verifyRefund(Number(order.orderId))
          log.info({ orderId: order.orderId, verified: verify.verified, status: verify.status }, "Shopify refund verified")
        }
      }
    }

    // Record refund against spend cap after successful refund
    if (refundResult.success && order.storeId && refundAmount > 0) {
      await recordRefund(req.userId!, order.storeId, refundAmount)
    }

    await getDb()
      .update(orders)
      .set({
        returnStatus: "approved",
        status: refundResult.success ? "refunded" : "approved",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))

    const [updated] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, req.userId!))).limit(1)

    log.info({ orderId: id, userId: req.userId, refundSuccess: refundResult.success, spendCapExceeded: !spendCapCheck.allowed }, "Order approved")
    return res.json({ ...updated, refundResult, spendCapExceeded: !spendCapCheck.allowed })
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to approve order")
    return res.status(500).json({ error: "Failed to approve order" })
  }
})

router.post("/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    await getDb()
      .update(orders)
      .set({
        returnStatus: "rejected",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))

    const [order] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, req.userId!))).limit(1)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    log.info({ orderId: id, userId: req.userId }, "Order rejected")
    return res.json(order)
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to reject order")
    return res.status(500).json({ error: "Failed to reject order" })
  }
})

router.post("/:id/flag", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    await getDb()
      .update(orders)
      .set({
        isFraud: "true",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, id), eq(orders.userId, req.userId!)))

    const [order] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, req.userId!))).limit(1)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    log.info({ orderId: id, userId: req.userId }, "Order flagged")
    return res.json(order)
  } catch (error) {
    log.error({ err: error, orderId: req.params.id }, "Failed to flag order")
    return res.status(500).json({ error: "Failed to flag order" })
  }
})

export default router
