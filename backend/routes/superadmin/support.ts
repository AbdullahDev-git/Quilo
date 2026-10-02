import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { announcements, supportTickets, featureFlags, users } from "../../models/schema"
import { authenticateSuperadmin, SuperadminAuthRequest } from "../../middleware/superadmin-auth"
import { eq, desc, count, ilike } from "drizzle-orm"

const router = Router()

// === Announcements ===

router.get("/announcements", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const list = await db.select().from(announcements).orderBy(desc(announcements.createdAt))
    return res.json({ announcements: list })
  } catch (error) {
    console.error("Fetch announcements error:", error)
    return res.status(500).json({ error: "Failed to fetch announcements" })
  }
})

router.post("/announcements", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const { title, message, type, targetPlans, status } = req.body

    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" })
    }

    const [created] = await db.insert(announcements).values({
      title,
      message,
      type: type || "info",
      targetPlans: targetPlans || ["all"],
      status: status || "draft",
      publishedAt: status === "published" ? new Date().toISOString() : null,
    }).returning()

    return res.json({ announcement: created })
  } catch (error) {
    console.error("Create announcement error:", error)
    return res.status(500).json({ error: "Failed to create announcement" })
  }
})

router.put("/announcements/:id", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { title, message, type, targetPlans, status } = req.body

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (title) updates.title = title
    if (message) updates.message = message
    if (type) updates.type = type
    if (targetPlans) updates.targetPlans = targetPlans
    if (status) {
      updates.status = status
      if (status === "published") updates.publishedAt = new Date().toISOString()
    }

    await db.update(announcements).set(updates).where(eq(announcements.id, id))
    return res.json({ success: true })
  } catch (error) {
    console.error("Update announcement error:", error)
    return res.status(500).json({ error: "Failed to update announcement" })
  }
})

router.delete("/announcements/:id", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    await db.delete(announcements).where(eq(announcements.id, req.params.id))
    return res.json({ success: true })
  } catch (error) {
    console.error("Delete announcement error:", error)
    return res.status(500).json({ error: "Failed to delete announcement" })
  }
})

// === Support Tickets ===

router.get("/tickets", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const status = req.query.status as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    let query = db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      message: supportTickets.message,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      adminResponse: supportTickets.adminResponse,
      respondedAt: supportTickets.respondedAt,
      createdAt: supportTickets.createdAt,
      userName: users.name,
      userEmail: users.email,
    }).from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))

    if (status) {
      query = query.where(eq(supportTickets.status, status)) as any
    }

    const tickets = await query
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db.select({ value: count() }).from(supportTickets)
    const [openCount] = await db.select({ value: count() }).from(supportTickets).where(eq(supportTickets.status, "open"))
    const [pendingCount] = await db.select({ value: count() }).from(supportTickets).where(eq(supportTickets.status, "pending"))

    return res.json({
      tickets,
      total: total.value,
      openCount: openCount.value,
      pendingCount: pendingCount.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    })
  } catch (error) {
    console.error("Fetch tickets error:", error)
    return res.status(500).json({ error: "Failed to fetch tickets" })
  }
})

router.put("/tickets/:id/respond", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { adminResponse, status } = req.body

    await db.update(supportTickets).set({
      adminResponse,
      status: status || "pending",
      respondedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(supportTickets.id, id))

    return res.json({ success: true })
  } catch (error) {
    console.error("Respond to ticket error:", error)
    return res.status(500).json({ error: "Failed to respond to ticket" })
  }
})

router.put("/tickets/:id/close", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    await db.update(supportTickets).set({
      status: "closed",
      updatedAt: new Date().toISOString(),
    }).where(eq(supportTickets.id, req.params.id))

    return res.json({ success: true })
  } catch (error) {
    console.error("Close ticket error:", error)
    return res.status(500).json({ error: "Failed to close ticket" })
  }
})

// === Feature Flags ===

router.get("/features", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const flags = await db.select().from(featureFlags).orderBy(featureFlags.name)
    return res.json({ features: flags })
  } catch (error) {
    console.error("Fetch features error:", error)
    return res.status(500).json({ error: "Failed to fetch features" })
  }
})

router.post("/features", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { name, displayName, description, enabled, requiredPlan } = req.body

    if (!name || !displayName) {
      return res.status(400).json({ error: "Name and display name are required" })
    }

    const [created] = await db.insert(featureFlags).values({
      name,
      displayName,
      description,
      enabled: String(enabled || false),
      requiredPlan,
    }).returning()

    return res.json({ feature: created })
  } catch (error) {
    console.error("Create feature error:", error)
    return res.status(500).json({ error: "Failed to create feature" })
  }
})

router.put("/features/:id", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { enabled, requiredPlan } = req.body

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (enabled !== undefined) updates.enabled = String(enabled)
    if (requiredPlan !== undefined) updates.requiredPlan = requiredPlan

    await db.update(featureFlags).set(updates).where(eq(featureFlags.id, id))
    return res.json({ success: true })
  } catch (error) {
    console.error("Update feature error:", error)
    return res.status(500).json({ error: "Failed to update feature" })
  }
})

router.delete("/features/:id", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    await db.delete(featureFlags).where(eq(featureFlags.id, req.params.id))
    return res.json({ success: true })
  } catch (error) {
    console.error("Delete feature error:", error)
    return res.status(500).json({ error: "Failed to delete feature" })
  }
})

export default router
