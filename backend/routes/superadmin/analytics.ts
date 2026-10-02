import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { users, stores, rules, auditLogs, subscriptions } from "../../models/schema"
import { authenticateSuperadmin } from "../../middleware/superadmin-auth"
import { count, sql, eq, desc, and, gte } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const days = parseInt(req.query.days as string) || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startIso = startDate.toISOString()

    // User growth over time (by day)
    const userGrowth = await db
      .select({
        date: sql<string>`date(${users.createdAt})`.as("date"),
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, startIso))
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`)

    // Store growth over time
    const storeGrowth = await db
      .select({
        date: sql<string>`date(${stores.createdAt})`.as("date"),
        count: count(),
      })
      .from(stores)
      .where(gte(stores.createdAt, startIso))
      .groupBy(sql`date(${stores.createdAt})`)
      .orderBy(sql`date(${stores.createdAt})`)

    // Rules created over time
    const ruleGrowth = await db
      .select({
        date: sql<string>`date(${rules.createdAt})`.as("date"),
        count: count(),
      })
      .from(rules)
      .where(gte(rules.createdAt, startIso))
      .groupBy(sql`date(${rules.createdAt})`)
      .orderBy(sql`date(${rules.createdAt})`)

    // Activity over time (audit logs)
    const activityGrowth = await db
      .select({
        date: sql<string>`date(${auditLogs.createdAt})`.as("date"),
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startIso))
      .groupBy(sql`date(${auditLogs.createdAt})`)
      .orderBy(sql`date(${auditLogs.createdAt})`)

    // Total stats
    const [totalUsers] = await db.select({ value: count() }).from(users)
    const [totalStores] = await db.select({ value: count() }).from(stores)
    const [totalRules] = await db.select({ value: count() }).from(rules)
    const [totalActivity] = await db.select({ value: count() }).from(auditLogs)
    const [totalTriggers] = await db.select({ value: sql<number>`coalesce(sum(${rules.triggerCount}), 0)` }).from(rules)

    // Top rules by trigger count
    const topRules = await db
      .select({
        name: rules.name,
        triggerCount: rules.triggerCount,
        status: rules.status,
      })
      .from(rules)
      .orderBy(desc(rules.triggerCount))
      .limit(10)

    // Activity by event type
    const activityByType = await db
      .select({
        event: auditLogs.event,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startIso))
      .groupBy(auditLogs.event)
      .orderBy(desc(count()))
      .limit(10)

    return res.json({
      totals: {
        users: totalUsers.value,
        stores: totalStores.value,
        rules: totalRules.value,
        activity: totalActivity.value,
        triggers: totalTriggers.value,
      },
      charts: {
        userGrowth,
        storeGrowth,
        ruleGrowth,
        activityGrowth,
      },
      topRules,
      activityByType,
    })
  } catch (error) {
    console.error("Fetch analytics error:", error)
    return res.status(500).json({ error: "Failed to fetch analytics" })
  }
})

export default router
