import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { rules, ruleDefinitions, users, stores } from "../../models/schema"
import { authenticateSuperadmin, SuperadminAuthRequest } from "../../middleware/superadmin-auth"
import { eq, desc, count, sql, ilike } from "drizzle-orm"

const router = Router()

// Get all rules with user/store info
router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    let query = db.select({
      id: rules.id,
      name: rules.name,
      description: rules.description,
      status: rules.status,
      requiredPlan: rules.requiredPlan,
      triggerCount: rules.triggerCount,
      lastTriggeredAt: rules.lastTriggeredAt,
      createdAt: rules.createdAt,
      userName: users.name,
      userEmail: users.email,
      storeName: stores.name,
    }).from(rules)
      .leftJoin(users, eq(rules.userId, users.id))
      .leftJoin(stores, eq(rules.storeId, stores.id))

    if (search) {
      query = query.where(ilike(rules.name, `%${search}%`)) as any
    }

    if (status) {
      query = query.where(eq(rules.status, status)) as any
    }

    const ruleList = await query
      .orderBy(desc(rules.triggerCount))
      .limit(limit)
      .offset(offset)

    const [total] = await db.select({ value: count() }).from(rules)

    return res.json({
      rules: ruleList,
      total: total.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    })
  } catch (error) {
    console.error("Fetch rules error:", error)
    return res.status(500).json({ error: "Failed to fetch rules" })
  }
})

// Get rule definitions (available rule types)
router.get("/definitions", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const definitions = await db.select().from(ruleDefinitions).orderBy(ruleDefinitions.category)
    return res.json({ definitions })
  } catch (error) {
    console.error("Fetch rule definitions error:", error)
    return res.status(500).json({ error: "Failed to fetch rule definitions" })
  }
})

// Update rule definition (change required plan or enabled status)
router.put("/definitions/:id", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { requiredPlan, enabled } = req.body

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (requiredPlan) updates.requiredPlan = requiredPlan
    if (enabled !== undefined) updates.enabled = String(enabled)

    await db.update(ruleDefinitions).set(updates).where(eq(ruleDefinitions.id, id))

    return res.json({ success: true })
  } catch (error) {
    console.error("Update rule definition error:", error)
    return res.status(500).json({ error: "Failed to update rule definition" })
  }
})

// Get stats
router.get("/stats", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const [totalRules] = await db.select({ value: count() }).from(rules)
    const [activeRules] = await db.select({ value: count() }).from(rules).where(eq(rules.status, "active"))
    const [totalTriggers] = await db.select({ value: sql<number>`coalesce(sum(${rules.triggerCount}), 0)` }).from(rules)

    return res.json({
      totalRules: totalRules.value,
      activeRules: activeRules.value,
      totalTriggers: totalTriggers.value,
    })
  } catch (error) {
    console.error("Fetch rules stats error:", error)
    return res.status(500).json({ error: "Failed to fetch stats" })
  }
})

export default router
