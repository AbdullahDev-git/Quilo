import { Router, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { config } from "../../config"
import { getDb } from "../../config/database"
import { stores } from "../../models/schema"
import { authenticate, AuthRequest } from "../../middleware/auth"
import { getShopifyAuthUrl, getAccessToken } from "../../plugins/shopify"
import { eq, and } from "drizzle-orm"
import { createContextLogger } from "../../config/logger"

const log = createContextLogger({ module: "shopify-oauth" })
const router = Router()

// GET /auth/shopify - Initiate Shopify OAuth
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { shop } = req.query

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "shop parameter is required" })
    }

    // Normalize shop domain
    const shopDomain = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "")

    // Generate state JWT with userId
    const state = jwt.sign(
      { userId: req.userId, shop: shopDomain },
      config.jwt.secret,
      { expiresIn: "10m" }
    )

    const authUrl = getShopifyAuthUrl(shopDomain, state)

    log.info({ shop: shopDomain, userId: req.userId }, "Initiating Shopify OAuth")

    // Return the URL for the frontend to redirect to
    res.json({ url: authUrl })
  } catch (err) {
    log.error({ err }, "Failed to generate Shopify auth URL")
    res.status(500).json({ error: "Failed to initiate Shopify OAuth" })
  }
})

// GET /auth/shopify/callback - Handle Shopify OAuth callback
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, shop } = req.query

    if (!code || !state || !shop) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Verify state JWT
    let decoded: { userId: string; shop: string }
    try {
      decoded = jwt.verify(state as string, config.jwt.secret) as { userId: string; shop: string }
    } catch {
      return res.status(400).json({ error: "Invalid or expired state" })
    }

    // Exchange code for access token
    const accessToken = await getAccessToken(decoded.shop, code as string)

    // Fetch shop info to get the store name and Shopify ID
    const shopResponse = await fetch(`https://${decoded.shop}/admin/api/2024-10/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    })

    let shopName = decoded.shop.replace(".myshopify.com", "")
    let shopifyStoreId = ""

    if (shopResponse.ok) {
      const shopData = await shopResponse.json()
      shopName = shopData.shop?.name || shopName
      shopifyStoreId = String(shopData.shop?.id || "")
    }

    const db = getDb()

    // Check if store already exists for this user
    const [existing] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.userId, decoded.userId), eq(stores.domain, decoded.shop)))

    if (existing) {
      // Update existing store
      await db
        .update(stores)
        .set({
          accessToken,
          shopifyStoreId,
          name: shopName,
          platform: "shopify",
          status: "active",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stores.id, existing.id))

      log.info({ storeId: existing.id, shop: decoded.shop }, "Shopify store updated")
    } else {
      // Create new store
      await db.insert(stores).values({
        userId: decoded.userId,
        name: shopName,
        domain: decoded.shop,
        platform: "shopify",
        accessToken,
        shopifyStoreId,
        status: "active",
      })

      log.info({ shop: decoded.shop, userId: decoded.userId }, "Shopify store created")
    }

    // Redirect back to frontend stores page
    res.redirect(`${config.frontendUrl}/dashboard/stores?connected=shopify`)
  } catch (err) {
    log.error({ err }, "Shopify OAuth callback failed")
    res.redirect(`${config.frontendUrl}/dashboard/connect-store?error=oauth_failed`)
  }
})

export default router
