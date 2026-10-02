import { Router, Response } from "express"
import { getDb } from "../config/database"
import { stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { audit } from "../middleware/audit"
import { getAccessToken } from "../plugins/shopify"
import { eq, and } from "drizzle-orm"
import { validate, createStoreSchema, connectStoreSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "stores" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userStores = await getDb()
      .select()
      .from(stores)
      .where(eq(stores.userId, req.userId!))

    return res.json(userStores)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch stores")
    return res.status(500).json({ error: "Failed to fetch stores" })
  }
})

router.post("/", audit("store.created"), validate(createStoreSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, domain, accessToken, platform } = req.body

    const storeId = crypto.randomUUID()
    await getDb()
      .insert(stores)
      .values({
        id: storeId,
        userId: req.userId!,
        name: name || domain?.replace(".myshopify.com", "") || "My Store",
        domain: domain,
        platform: platform || "custom",
        accessToken: accessToken,
        shopifyStoreId: null,
        status: "active",
      })

    const [store] = await getDb().select().from(stores).where(eq(stores.id, storeId)).limit(1)

    log.info({ storeId: store.id, userId: req.userId, domain }, "Store created")
    return res.status(201).json(store)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to create store")
    return res.status(500).json({ error: "Failed to create store" })
  }
})

router.post("/connect", audit("store.connected"), validate(connectStoreSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { shop, code } = req.body

    const accessToken = await getAccessToken(shop, code)

    const storeId = crypto.randomUUID()
    await getDb()
      .insert(stores)
      .values({
        id: storeId,
        userId: req.userId!,
        name: shop.replace(".myshopify.com", ""),
        domain: shop,
        platform: "shopify",
        accessToken,
      })

    const [store] = await getDb().select().from(stores).where(eq(stores.id, storeId)).limit(1)

    log.info({ storeId: store.id, userId: req.userId, domain: shop }, "Store connected via OAuth")
    return res.status(201).json(store)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to connect store")
    return res.status(500).json({ error: "Failed to connect store" })
  }
})

router.delete("/:id", audit("store.disconnected"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const [store] = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, id), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    await getDb().delete(stores).where(eq(stores.id, id))

    log.info({ storeId: id, userId: req.userId }, "Store disconnected")
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, storeId: req.params.id }, "Failed to disconnect store")
    return res.status(500).json({ error: "Failed to disconnect store" })
  }
})

export default router
