import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { platformConfig } from "../../models/schema"
import { authenticateSuperadmin, SuperadminAuthRequest } from "../../middleware/superadmin-auth"
import { eq, desc } from "drizzle-orm"

const router = Router()

// Get all config values
router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const configs = await db.select().from(platformConfig).orderBy(platformConfig.category, platformConfig.label)

    // Mask password fields for display
    const masked = configs.map((c) => ({
      ...c,
      displayValue: c.type === "password" && c.value ? "••••••••" : c.value,
    }))

    return res.json({ configs: masked })
  } catch (error) {
    console.error("Fetch config error:", error)
    return res.status(500).json({ error: "Failed to fetch config" })
  }
})

// Update config values (batch)
router.put("/", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const { updates } = req.body // Array of { key, value }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Updates must be an array" })
    }

    for (const update of updates) {
      // Skip password fields that still show masked value
      if (update.value === "••••••••") continue

      await db.update(platformConfig).set({
        value: update.value,
        updatedAt: new Date().toISOString(),
      }).where(eq(platformConfig.key, update.key))
    }

    return res.json({ success: true })
  } catch (error) {
    console.error("Update config error:", error)
    return res.status(500).json({ error: "Failed to update config" })
  }
})

// Get config by category
router.get("/category/:category", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const configs = await db.select().from(platformConfig)
      .where(eq(platformConfig.category, req.params.category))
      .orderBy(platformConfig.label)

    return res.json({ configs })
  } catch (error) {
    console.error("Fetch config by category error:", error)
    return res.status(500).json({ error: "Failed to fetch config" })
  }
})

export default router
