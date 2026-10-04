import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { stores } from "../../models/schema"
import { eq } from "drizzle-orm"
import { createContextLogger } from "../../config/logger"
import {
  parseAuthCallback,
  consumePendingConnection,
  createWooCommerceService,
} from "../../services/woocommerce"

const log = createContextLogger({ module: "woocommerce-oauth" })
const router = Router()

// POST /api/auth/woocommerce/callback
// WC-Auth flow: the WooCommerce store server POSTs key/secret here after the merchant approves.
// This is a public endpoint (no JWT) — state token from initiate flow identifies the user.
router.post("/callback", async (req: Request, res: Response) => {
  try {
    const data = parseAuthCallback(req.body, req.query)

    if (!data) {
      log.warn({ body: Object.keys(req.body || {}), query: req.query }, "WooCommerce callback: missing required fields")
      return res.status(400).send("Missing key, secret, or store_url")
    }

    if (data.status && data.status !== "success") {
      log.warn({ status: data.status, message: data.message, storeUrl: data.store_url }, "WooCommerce auth denied")
      return res.status(400).send(`Authorization ${data.status}: ${data.message || "Unknown error"}`)
    }

    if (!data.state) {
      log.warn({ storeUrl: data.store_url }, "WooCommerce callback: missing state token")
      return res.status(400).send("Missing state token")
    }

    const pending = consumePendingConnection(data.state)
    if (!pending) {
      log.warn({ storeUrl: data.store_url, state: data.state.slice(0, 8) }, "WooCommerce callback: invalid or expired state")
      return res.status(400).send("Invalid or expired connection request. Please try connecting again.")
    }

    // Validate credentials by making a test API call
    const service = createWooCommerceService(data.store_url, data.key, data.secret)
    const valid = await service.validate()
    if (!valid) {
      log.warn({ storeUrl: data.store_url, userId: pending.userId }, "WooCommerce callback: credential validation failed")
      return res.status(400).send("Failed to validate WooCommerce credentials. Please check your consumer key/secret permissions.")
    }

    // Verify the store URL matches what the user initiated
    if (pending.storeUrl !== data.store_url) {
      log.warn({ expected: pending.storeUrl, received: data.store_url }, "WooCommerce callback: store URL mismatch")
      return res.status(400).send("Store URL mismatch. The callback store does not match the initiated connection.")
    }

    const db = getDb()
    const storeName = data.store_url.replace("https://", "").replace("http://", "").replace(/\/.*$/, "")

    // Check if store already exists for this user
    const [existing] = await db
      .select()
      .from(stores)
      .where(eq(stores.domain, data.store_url))

    if (existing) {
      await db
        .update(stores)
        .set({
          accessToken: `${data.key}:${data.secret}`,
          platform: "woocommerce",
          status: "active",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stores.id, existing.id))
      log.info({ storeId: existing.id, storeUrl: data.store_url, userId: pending.userId }, "WooCommerce store updated")
    } else {
      await db.insert(stores).values({
        userId: pending.userId,
        name: storeName,
        domain: data.store_url,
        platform: "woocommerce",
        accessToken: `${data.key}:${data.secret}`,
        status: "active",
      })
      log.info({ storeUrl: data.store_url, userId: pending.userId }, "WooCommerce store created")
    }

    // Redirect back to frontend stores page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    return res.redirect(`${frontendUrl}/dashboard/stores?connected=woocommerce`)
  } catch (err) {
    log.error({ err }, "WooCommerce OAuth callback failed")
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    return res.redirect(`${frontendUrl}/dashboard/connect-store?error=oauth_failed`)
  }
})

export default router
