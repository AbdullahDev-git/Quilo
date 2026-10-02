import { Router, Response } from "express"
import { getDb } from "../config/database"
import { spendCaps, stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { validate, updateSpendCapSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "spend-caps" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userStores = await getDb().select().from(stores).where(eq(stores.userId, req.userId!))
    const caps = await getDb().select().from(spendCaps).where(eq(spendCaps.userId, req.userId!))

    const result = userStores.map(store => {
      const cap = caps.find(c => c.storeId === store.id)
      const used = parseFloat(cap?.currentSpent || "0")
      const limit = parseFloat(cap?.monthlyLimit || "2500")
      return {
        storeId: store.id,
        storeName: store.name,
        limit: limit.toFixed(2),
        used: used.toFixed(2),
        percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
      }
    })

    return res.json(result)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch spend caps")
    return res.status(500).json({ error: "Failed to fetch spend caps" })
  }
})

router.put("/:storeId", validate(updateSpendCapSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params
    const { limit } = req.body

    const [store] = await getDb().select().from(stores).where(and(eq(stores.id, storeId), eq(stores.userId, req.userId!))).limit(1)
    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const [existing] = await getDb().select().from(spendCaps).where(and(eq(spendCaps.userId, req.userId!), eq(spendCaps.storeId, storeId))).limit(1)

    let cap
    if (existing) {
      await getDb()
        .update(spendCaps)
        .set({ monthlyLimit: limit.toString(), updatedAt: new Date().toISOString() })
        .where(eq(spendCaps.id, existing.id))
      ;[cap] = await getDb().select().from(spendCaps).where(eq(spendCaps.id, existing.id)).limit(1)
    } else {
      const capId = crypto.randomUUID()
      await getDb()
        .insert(spendCaps)
        .values({ id: capId, userId: req.userId!, storeId, monthlyLimit: limit.toString(), currentSpent: "0" })
      ;[cap] = await getDb().select().from(spendCaps).where(eq(spendCaps.id, capId)).limit(1)
    }

    log.info({ storeId, limit, userId: req.userId }, "Spend cap updated")
    return res.json(cap)
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to update spend cap")
    return res.status(500).json({ error: "Failed to update spend cap" })
  }
})

export default router
