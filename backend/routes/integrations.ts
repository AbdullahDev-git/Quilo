import { Router, Response } from "express"
import { getDb } from "../config/database"
import { integrations } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { validate, createIntegrationSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "integrations" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userIntegrations = await getDb().select().from(integrations).where(eq(integrations.userId, req.userId!))
    return res.json(userIntegrations)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch integrations")
    return res.status(500).json({ error: "Failed to fetch integrations" })
  }
})

router.post("/", validate(createIntegrationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, config } = req.body

    const [existing] = await getDb().select().from(integrations).where(and(eq(integrations.userId, req.userId!), eq(integrations.type, type))).limit(1)

    let integration
    if (existing) {
      await getDb()
        .update(integrations)
        .set({ name, config, status: "connected", lastSyncAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(integrations.id, existing.id))
      ;[integration] = await getDb().select().from(integrations).where(eq(integrations.id, existing.id)).limit(1)
    } else {
      const intId = crypto.randomUUID()
      await getDb()
        .insert(integrations)
        .values({ id: intId, userId: req.userId!, name, type, config, status: "connected", lastSyncAt: new Date().toISOString() })
      ;[integration] = await getDb().select().from(integrations).where(eq(integrations.id, intId)).limit(1)
    }

    log.info({ integrationId: integration.id, type, userId: req.userId }, "Integration saved")
    return res.status(201).json(integration)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to save integration")
    return res.status(500).json({ error: "Failed to create integration" })
  }
})

router.delete("/:type", async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params

    const [integration] = await getDb().select().from(integrations).where(and(eq(integrations.userId, req.userId!), eq(integrations.type, type))).limit(1)

    if (!integration) {
      return res.status(404).json({ error: "Integration not found" })
    }

    await getDb().update(integrations).set({ status: "disconnected", config: {}, updatedAt: new Date().toISOString() }).where(eq(integrations.id, integration.id))

    log.info({ type, userId: req.userId }, "Integration disconnected")
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, type: req.params.type }, "Failed to disconnect integration")
    return res.status(500).json({ error: "Failed to disconnect integration" })
  }
})

export default router
