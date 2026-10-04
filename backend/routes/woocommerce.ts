import { Router, Response } from "express"
import { getDb } from "../config/database"
import { stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { audit } from "../middleware/audit"
import { eq, and } from "drizzle-orm"
import { createContextLogger } from "../config/logger"
import {
  createWooCommerceService,
  getAuthUrl,
  createPendingConnection,
  normalizeStoreUrl,
} from "../services/woocommerce"
import { syncWooOrders } from "../controllers/woocommerce"
import { config } from "../config"

const log = createContextLogger({ module: "woocommerce" })
const router = Router()

// GET /api/woocommerce/auth-url — initiate WC-Auth flow
router.get("/auth-url", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { storeUrl } = req.query
    if (!storeUrl || typeof storeUrl !== "string") {
      return res.status(400).json({ error: "storeUrl is required" })
    }

    const normalized = normalizeStoreUrl(storeUrl)

    // Quick sanity check: store URL should look like a domain
    try {
      new URL(normalized)
    } catch {
      return res.status(400).json({ error: "Invalid store URL" })
    }

    // Create pending connection and generate auth URL
    const stateToken = createPendingConnection(req.userId!, normalized)

    const callbackUrl = `${req.protocol}://${req.get("host")}/api/auth/woocommerce/callback`
    const returnUrl = `${config.frontendUrl}/dashboard/stores`
    const url = getAuthUrl(normalized, callbackUrl, returnUrl, stateToken)

    log.info({ userId: req.userId, storeUrl: normalized }, "WooCommerce auth URL generated")
    return res.json({ url })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to generate WooCommerce auth URL")
    return res.status(500).json({ error: "Failed to generate auth URL" })
  }
})

// POST /api/woocommerce/connect — manual key entry (fallback)
router.post("/connect", authenticate, audit("store.connected"), async (req: AuthRequest, res: Response) => {
  try {
    const { storeUrl, consumerKey, consumerSecret } = req.body
    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({ error: "storeUrl, consumerKey, and consumerSecret are required" })
    }

    const normalized = normalizeStoreUrl(storeUrl)

    // Validate credentials
    const service = createWooCommerceService(normalized, consumerKey, consumerSecret)
    const valid = await service.validate()
    if (!valid) {
      return res.status(400).json({ error: "Failed to validate WooCommerce credentials. Check your consumer key/secret permissions." })
    }

    const db = getDb()
    const storeName = normalized.replace("https://", "").replace("http://", "").replace(/\/.*$/, "")

    const [existing] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.domain, normalized), eq(stores.userId, req.userId!)))

    let storeId: string

    if (existing) {
      storeId = existing.id
      await db
        .update(stores)
        .set({
          accessToken: `${consumerKey}:${consumerSecret}`,
          platform: "woocommerce",
          status: "active",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stores.id, existing.id))
    } else {
      storeId = crypto.randomUUID()
      await db.insert(stores).values({
        id: storeId,
        userId: req.userId!,
        name: storeName,
        domain: normalized,
        platform: "woocommerce",
        accessToken: `${consumerKey}:${consumerSecret}`,
        status: "active",
      })
    }

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)

    log.info({ storeId: store.id, userId: req.userId, storeUrl: normalized }, "WooCommerce store connected (manual)")
    return res.status(201).json(store)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to connect WooCommerce store")
    return res.status(500).json({ error: "Failed to connect store" })
  }
})

// POST /api/woocommerce/sync-orders/:storeId — sync orders from WooCommerce
router.post("/sync-orders/:storeId", authenticate, syncWooOrders)

// GET /api/woocommerce/orders/:storeId — fetch orders from WooCommerce API
router.get("/orders/:storeId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params
    const [store] = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const [consumerKey, consumerSecret] = store.accessToken.split(":")
    const service = createWooCommerceService(store.domain, consumerKey, consumerSecret)
    const orders = await service.getOrders(50)

    return res.json(orders)
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to fetch WooCommerce orders")
    return res.status(500).json({ error: "Failed to fetch orders" })
  }
})

export default router
