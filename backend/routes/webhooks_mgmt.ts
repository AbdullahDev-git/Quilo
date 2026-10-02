import { Router, Response } from "express"
import { getDb } from "../config/database"
import { webhooks, stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { validate, createWebhookSchema, updateWebhookSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "webhooks" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userWebhooks = await getDb()
      .select()
      .from(webhooks)
      .innerJoin(stores, eq(webhooks.storeId, stores.id))
      .where(eq(stores.userId, req.userId!))

    return res.json(userWebhooks.map((row) => row.webhooks))
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch webhooks")
    return res.status(500).json({ error: "Failed to fetch webhooks" })
  }
})

router.post("/", validate(createWebhookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, topic, endpoint } = req.body

    const [store] = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    const whId = crypto.randomUUID()
    await getDb()
      .insert(webhooks)
      .values({
        id: whId,
        storeId,
        topic,
        endpoint,
        status: "active",
      })

    const [webhook] = await getDb().select().from(webhooks).where(eq(webhooks.id, whId)).limit(1)

    log.info({ webhookId: webhook.id, storeId, topic }, "Webhook created")
    return res.status(201).json(webhook)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to create webhook")
    return res.status(500).json({ error: "Failed to create webhook" })
  }
})

router.put("/:id", validate(updateWebhookSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { topic, endpoint, status } = req.body

    const [webhook] = await getDb()
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1)

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" })
    }

    const store = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, webhook.storeId), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    await getDb()
      .update(webhooks)
      .set({
        ...(topic && { topic }),
        ...(endpoint && { endpoint }),
        ...(status && { status }),
        lastDeliveryAt: new Date().toISOString(),
      })
      .where(eq(webhooks.id, id))

    const [updated] = await getDb().select().from(webhooks).where(eq(webhooks.id, id)).limit(1)

    log.info({ webhookId: id }, "Webhook updated")
    return res.json(updated)
  } catch (error) {
    log.error({ err: error, webhookId: req.params.id }, "Failed to update webhook")
    return res.status(500).json({ error: "Failed to update webhook" })
  }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const webhook = await getDb()
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1)

    if (!webhook[0]) {
      return res.status(404).json({ error: "Webhook not found" })
    }

    const store = await getDb()
      .select()
      .from(stores)
      .where(and(eq(stores.id, webhook[0].storeId), eq(stores.userId, req.userId!)))
      .limit(1)

    if (!store) {
      return res.status(404).json({ error: "Store not found" })
    }

    await getDb().delete(webhooks).where(eq(webhooks.id, id))

    log.info({ webhookId: id }, "Webhook deleted")
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, webhookId: req.params.id }, "Failed to delete webhook")
    return res.status(500).json({ error: "Failed to delete webhook" })
  }
})

export default router
