import { Router, Response } from "express"
import { getStoreContext } from "../services/store-context"
import { checkRulesForReturn } from "../services/conversation"
import { getDb } from "../config/database"
import { stores } from "../models/schema"
import { eq } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "portal" })
const router = Router()

// Public: get store info for the return portal page
router.get("/:storeId", async (req: any, res: Response) => {
  try {
    const { storeId } = req.params

    const [store] = await getDb()
      .select({ id: stores.id, name: stores.name, platform: stores.platform, status: stores.status })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store || store.status !== "active") {
      return res.status(404).json({ error: "Store not found" })
    }

    const context = await getStoreContext(storeId)

    return res.json({
      storeId: store.id,
      storeName: store.name,
      platform: store.platform,
      returnPolicySummary: context?.returnPolicySummary || "Returns accepted within 30 days of delivery.",
    })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to load portal store info")
    return res.status(500).json({ error: "Failed to load store information" })
  }
})

// Public: submit a return/exchange request via the portal
router.post("/:storeId/submit", async (req: any, res: Response) => {
  try {
    const { storeId } = req.params
    const { orderNumber, email, itemName, reason, requestType } = req.body

    if (!storeId || !orderNumber || !email || !reason) {
      return res.status(400).json({ error: "storeId, orderNumber, email, and reason are required" })
    }

    const [store] = await getDb()
      .select({ id: stores.id, name: stores.name, platform: stores.platform, status: stores.status })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store || store.status !== "active") {
      return res.status(404).json({ error: "Store not found" })
    }

    const storeContext = await getStoreContext(storeId)

    // Map requestType to preferredAction used by the rules engine
    const preferredAction =
      requestType === "exchange" ? "exchange" :
      requestType === "store_credit" ? "store_credit" :
      "refund"

    const context = {
      orderNumber: String(orderNumber).trim(),
      returnReason: String(reason).trim(),
      preferredAction,
      customerEmail: String(email).trim(),
      selectedItem: itemName ? String(itemName).trim() : undefined,
      source: "portal",
    }

    const result = await checkRulesForReturn(context, storeId, storeContext)

    const decision = result.details?.decision || "flag_for_review"

    // Human-readable status message
    let message: string
    if (decision === "refund_processed") {
      message = result.details?.emailMessage
        ? `Your refund has been processed. ${result.details.emailMessage}`
        : "Your refund has been processed. You will receive it within 5-10 business days."
    } else if (decision === "auto_approve") {
      message = "Your request has been approved and processed automatically."
    } else if (decision === "auto_deny") {
      message = "Your request does not meet the return policy requirements. If you believe this is an error, please contact the store directly."
    } else {
      message = "Your request has been submitted for review. The store will process it shortly and notify you via email."
    }

    return res.json({
      decision,
      status: result.status,
      message,
      ruleName: result.details?.ruleName || null,
      reason: result.details?.reason || null,
      amount: result.details?.amount || null,
      verified: result.details?.verified ?? null,
      mock: result.details?.mock ?? null,
      emailSent: result.details?.emailSent ?? null,
    })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Portal return submission failed")
    return res.status(500).json({ error: "Failed to submit return request" })
  }
})

export default router
