import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { users, subscriptions } from "../../models/schema"
import { authenticateSuperadmin } from "../../middleware/superadmin-auth"
import { count, sql, eq } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()

    const [totalUsers] = await db.select({ value: count() }).from(users)

    const planCounts = await db
      .select({
        plan: subscriptions.plan,
        count: count(),
      })
      .from(subscriptions)
      .groupBy(subscriptions.plan)

    const statusCounts = await db
      .select({
        status: subscriptions.status,
        count: count(),
      })
      .from(subscriptions)
      .groupBy(subscriptions.status)

    const [totalSubscriptions] = await db.select({ value: count() }).from(subscriptions)

    return res.json({
      stats: {
        totalUsers: totalUsers.value,
        totalSubscriptions: totalSubscriptions.value,
      },
      planCounts,
      statusCounts,
    })
  } catch (error) {
    console.error("Fetch billing error:", error)
    return res.status(500).json({ error: "Failed to fetch billing data" })
  }
})

export default router
