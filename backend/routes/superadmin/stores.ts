import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { stores, users, orders } from "../../models/schema"
import { authenticateSuperadmin } from "../../middleware/superadmin-auth"
import { eq, desc, count, sql } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    let query = db.select({
      id: stores.id,
      name: stores.name,
      domain: stores.domain,
      status: stores.status,
      userId: stores.userId,
      userName: users.name,
      userEmail: users.email,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
    }).from(stores)
      .leftJoin(users, eq(stores.userId, users.id))

    if (search) {
      query = query.where(
        sql`${stores.name} ILIKE ${"%" + search + "%"} OR ${stores.domain} ILIKE ${"%" + search + "%"}`
      ) as any
    }

    if (status) {
      query = query.where(eq(stores.status, status)) as any
    }

    const storeList = await query
      .orderBy(desc(stores.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db.select({ value: count() }).from(stores)

    // Get order counts per store
    const storeIds = storeList.map(s => s.id)
    const orderCounts = storeIds.length > 0 ? await db
      .select({ storeId: orders.storeId, count: count() })
      .from(orders)
      .where(sql`${orders.storeId} IN ${storeIds}`)
      .groupBy(orders.storeId) : []

    const enrichedStores = storeList.map(store => ({
      ...store,
      orderCount: orderCounts.find(o => o.storeId === store.id)?.count || 0,
    }))

    return res.json({
      stores: enrichedStores,
      total: total.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    })
  } catch (error) {
    console.error("Fetch stores error:", error)
    return res.status(500).json({ error: "Failed to fetch stores" })
  }
})

export default router
