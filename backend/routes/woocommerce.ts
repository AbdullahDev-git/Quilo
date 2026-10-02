import { Router, Response } from "express"
import { getDb } from "../config/database"
import { stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { audit } from "../middleware/audit"
import { eq, and } from "drizzle-orm"
import { createContextLogger } from "../config/logger"
import { createWooCommerceService, getAuthUrl } from "../services/woocommerce"

const log = createContextLogger({ module: "woocommerce" })
const router = Router()

router.use(authenticate)

router.get("/auth-url", async (req: AuthRequest, res: Response) => {
  try {
    const { storeUrl, redirectUri } = req.query
    if (!storeUrl || !redirectUri) {
      return res.status(400).json({ error: "storeUrl and redirectUri are required" })
    }

    const url = getAuthUrl(storeUrl as string, redirectUri as string)
    return res.json({ url })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to generate WooCommerce auth URL")
    return res.status(500).json({ error: "Failed to generate auth URL" })
  }
})

router.post("/connect", audit("store.connected"), async (req: AuthRequest, res: Response) => {
  try {
    const { storeUrl, consumerKey, consumerSecret } = req.body
    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({ error: "storeUrl, consumerKey, and consumerSecret are required" })
    }

    const service = createWooCommerceService(storeUrl, consumerKey, consumerSecret)
    const products = await service.getProducts(1)

    const storeId = crypto.randomUUID()
    await getDb()
      .insert(stores)
      .values({
        id: storeId,
        userId: req.userId!,
        name: storeUrl.replace("https://", "").replace("http://", ""),
        domain: storeUrl,
        accessToken: `${consumerKey}:${consumerSecret}`,
        status: "active",
      })

    const [store] = await getDb().select().from(stores).where(eq(stores.id, storeId)).limit(1)

    log.info({ storeId: store.id, userId: req.userId, storeUrl }, "WooCommerce store connected")
    return res.status(201).json(store)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to connect WooCommerce store")
    return res.status(500).json({ error: "Failed to connect store" })
  }
})

router.get("/orders/:storeId", async (req: AuthRequest, res: Response) => {
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
