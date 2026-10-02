import { Router, Response } from "express"
import { getDb } from "../config/database"
import { auditLogs } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, desc, and } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "activity" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const offset = (page - 1) * limit
    const event = req.query.event as string
    const storeId = req.query.storeId as string

    const conditions = [eq(auditLogs.userId, req.userId!)]
    if (event) {
      conditions.push(eq(auditLogs.event, event))
    }
    if (storeId) {
      conditions.push(eq(auditLogs.storeId, storeId))
    }

    const logs = await getDb()
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)

    return res.json({
      logs,
      page,
      limit,
    })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch audit logs")
    return res.status(500).json({ error: "Failed to fetch audit logs" })
  }
})

export default router
