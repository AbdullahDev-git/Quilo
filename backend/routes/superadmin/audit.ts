import { Router, Request, Response } from "express"
import { getDb } from "../../config/database"
import { adminAuditLogs, admins } from "../../models/schema"
import { authenticateSuperadmin } from "../../middleware/superadmin-auth"
import { desc, count, sql, eq } from "drizzle-orm"

const router = Router()

router.get("/", authenticateSuperadmin, async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const event = req.query.event as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const offset = (page - 1) * limit

    let query = db.select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      event: adminAuditLogs.event,
      description: adminAuditLogs.description,
      ipAddress: adminAuditLogs.ipAddress,
      userAgent: adminAuditLogs.userAgent,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt,
      adminEmail: admins.email,
      adminName: admins.name,
    }).from(adminAuditLogs)
      .leftJoin(admins, eq(adminAuditLogs.adminId, admins.id))

    if (event) {
      query = query.where(sql`${adminAuditLogs.event} ILIKE ${"%" + event + "%"}`) as any
    }

    const logs = await query
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db.select({ value: count() }).from(adminAuditLogs)

    return res.json({
      logs,
      total: total.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    })
  } catch (error) {
    console.error("Fetch audit logs error:", error)
    return res.status(500).json({ error: "Failed to fetch audit logs" })
  }
})

export default router
