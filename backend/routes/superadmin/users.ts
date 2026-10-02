import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { users, stores, orders } from "../../models/schema"
import { authenticateSuperadmin, SuperadminAuthRequest } from "../../middleware/superadmin-auth"
import { eq, desc, count, like, sql } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const search = req.query.search as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    let query = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      lockedUntil: users.lockedUntil,
    }).from(users)

    if (search) {
      query = query.where(
        sql`${users.email} ILIKE ${"%" + search + "%"} OR ${users.name} ILIKE ${"%" + search + "%"}`
      ) as any
    }

    const userList = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db.select({ value: count() }).from(users)

    // Get store/order counts per user
    const userIds = userList.map(u => u.id)
    const storeCounts = userIds.length > 0 ? await db
      .select({ userId: stores.userId, count: count() })
      .from(stores)
      .where(sql`${stores.userId} IN ${userIds}`)
      .groupBy(stores.userId) : []

    const orderCounts = userIds.length > 0 ? await db
      .select({ userId: orders.userId, count: count() })
      .from(orders)
      .where(sql`${orders.userId} IN ${userIds}`)
      .groupBy(orders.userId) : []

    const enrichedUsers = userList.map(user => ({
      ...user,
      storeCount: storeCounts.find(s => s.userId === user.id)?.count || 0,
      orderCount: orderCounts.find(o => o.userId === user.id)?.count || 0,
      status: user.lockedUntil && new Date(user.lockedUntil) > new Date() ? "locked" : "active",
    }))

    return res.json({
      users: enrichedUsers,
      total: total.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    })
  } catch (error) {
    console.error("Fetch users error:", error)
    return res.status(500).json({ error: "Failed to fetch users" })
  }
})

router.get("/:id", authenticateSuperadmin, async (req: SuperadminAuthRequest, res: Response) => {
  try {
    const db = getDb()
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const [storeCount] = await db.select({ value: count() }).from(stores).where(eq(stores.userId, user.id))
    const [orderCount] = await db.select({ value: count() }).from(orders).where(eq(orders.userId, user.id))

    return res.json({
      user: {
        ...user,
        passwordHash: undefined,
        storeCount: storeCount.value,
        orderCount: orderCount.value,
      },
    })
  } catch (error) {
    console.error("Fetch user error:", error)
    return res.status(500).json({ error: "Failed to fetch user" })
  }
})

export default router
