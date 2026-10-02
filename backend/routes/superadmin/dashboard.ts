import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { users, stores, orders, rules, adminAuditLogs } from "../../models/schema"
import { authenticateSuperadmin, SuperadminAuthRequest } from "../../middleware/superadmin-auth"
import { sql, desc, eq, count, gte } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Total counts
    const [totalUsers] = await db.select({ value: count() }).from(users)
    const [totalStores] = await db.select({ value: count() }).from(stores)
    const [totalOrders] = await db.select({ value: count() }).from(orders)
    const [totalRules] = await db.select({ value: count() }).from(rules)

    // New users this month
    const [newUsersMonth] = await db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))

    // Active stores
    const [activeStores] = await db
      .select({ value: count() })
      .from(stores)
      .where(eq(stores.status, "active"))

    // Orders this month
    const [ordersMonth] = await db
      .select({ value: count() })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))

    // Recent activity (last 10 audit logs)
    const recentActivity = await db
      .select()
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(10)

    // Orders by status
    const ordersByStatus = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status)

    return res.json({
      stats: {
        totalUsers: totalUsers.value,
        totalStores: totalStores.value,
        totalOrders: totalOrders.value,
        totalRules: totalRules.value,
        newUsersMonth: newUsersMonth.value,
        activeStores: activeStores.value,
        ordersMonth: ordersMonth.value,
      },
      recentActivity,
      ordersByStatus,
    })
  } catch (error) {
    console.error("Superadmin dashboard error:", error)
    return res.status(500).json({ error: "Failed to fetch dashboard data" })
  }
})

export default router
