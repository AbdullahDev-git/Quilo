import { Request, Response } from "express"
import { config } from "../config"
import { getDb } from "../config/database"
import { subscriptions } from "../models/schema"
import { eq } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "lemon-squeezy-webhook" })

export async function handleLemonSqueezyWebhook(req: Request, res: Response) {
  const signature = req.headers["x-signature"] as string

  try {
    const body = JSON.stringify(req.body)
    const secret = config.lemonSqueezy.webhookSecret

    if (secret && signature) {
      const crypto = require("crypto")
      const hmac = crypto.createHmac("sha256", secret)
      hmac.update(body)
      const digest = hmac.digest("hex")
      if (digest !== signature) {
        return res.status(400).json({ error: "Invalid webhook signature" })
      }
    }

    const event = req.body
    const db = getDb()

    switch (event.meta?.event_name) {
      case "subscription_created": {
        const attrs = event.data?.attributes
        if (!attrs) break

        const userId = attrs.custom_data?.user_id
        if (userId) {
          await db.insert(subscriptions).values({
            userId,
            lemonSqueezyId: event.data.id,
            plan: attrs.product_name?.toLowerCase().includes("pro") ? "pro" : "starter",
            status: "active",
            currentPeriodStart: attrs.created_at,
            currentPeriodEnd: attrs.renews_at,
          })
          log.info({ userId, subscriptionId: event.data.id }, "Subscription created")
        }
        break
      }
      case "subscription_updated": {
        const attrs = event.data?.attributes
        if (!attrs) break

        await db
          .update(subscriptions)
          .set({
            status: attrs.cancelled ? "cancelled" : "active",
            currentPeriodEnd: attrs.renews_at,
          })
          .where(eq(subscriptions.lemonSqueezyId, event.data.id))
        log.info({ subscriptionId: event.data.id }, "Subscription updated")
        break
      }
      case "subscription_cancelled": {
        await db
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(eq(subscriptions.lemonSqueezyId, event.data.id))
        log.info({ subscriptionId: event.data.id }, "Subscription cancelled")
        break
      }
      case "subscription_expired": {
        await db
          .update(subscriptions)
          .set({ status: "expired" })
          .where(eq(subscriptions.lemonSqueezyId, event.data.id))
        log.info({ subscriptionId: event.data.id }, "Subscription expired")
        break
      }
    }

    return res.json({ received: true })
  } catch (error) {
    log.error({ err: error }, "Lemon Squeezy webhook error")
    return res.status(500).json({ error: "Webhook processing failed" })
  }
}
