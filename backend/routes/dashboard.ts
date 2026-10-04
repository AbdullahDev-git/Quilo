import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, rules, stores, auditLogs, webhooks } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, desc, and, sql } from "drizzle-orm"
import { createContextLogger } from "../config/logger"
import { config } from "../config"

const log = createContextLogger({ module: "dashboard" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    const [userOrders, userRules, userStores, userAuditLogs, userWebhooks] = await Promise.all([
      getDb().select().from(orders).where(eq(orders.userId, userId)),
      getDb().select().from(rules).where(eq(rules.userId, userId)),
      getDb().select().from(stores).where(eq(stores.userId, userId)),
      getDb().select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(10),
      getDb().select().from(webhooks).innerJoin(stores, eq(webhooks.storeId, stores.id)).where(eq(stores.userId, userId)),
    ])

    const totalOrders = userOrders.length
    const refundsProcessed = userOrders.filter(o => o.returnStatus === "auto_approved" || o.status === "refunded").length
    const pendingApprovals = userOrders.filter(o => o.returnStatus === "pending" || o.returnStatus === "Pending").length
    const flaggedCount = userOrders.filter(o => o.isFraud === "true" || o.returnStatus === "flagged").length

    const moneySaved = userOrders
      .filter(o => o.returnStatus === "auto_approved" || o.status === "refunded")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)

    const hoursSaved = refundsProcessed * (config.dashboard.minutesSavedPerRefund / 60)

    const activeRules = userRules.filter(r => r.status === "active").length
    const totalTriggers = userRules.reduce((sum, r) => sum + (r.triggerCount || 0), 0)

    const activeStores = userStores.filter(s => s.status === "active").length
    const errorStores = userStores.filter(s => s.status === "error" || s.status === "Error").length

    const recentActivity = userAuditLogs.map(log => ({
      id: log.id,
      action: log.description,
      store: log.storeId ? "Store" : "Admin",
      time: formatTimeAgo(new Date(log.createdAt)),
      icon: getIconForEvent(log.event),
    }))

    const quickStats = [
      { label: "Rules Active", value: String(activeRules) },
      { label: "Rules Triggered", value: String(totalTriggers) },
      { label: "Connected Stores", value: String(activeStores) },
      { label: "Errors", value: String(errorStores), highlight: errorStores > 0 },
    ]

    return res.json({
      stats: {
        refundsProcessed: String(refundsProcessed),
        moneySaved: formatCurrency(moneySaved),
        hoursSaved: `${Math.round(hoursSaved)}h`,
        pendingApprovals: String(pendingApprovals),
        flaggedCount: String(flaggedCount),
        totalOrders: String(totalOrders),
      },
      recentActivity,
      connectedStores: userStores.map(s => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        status: s.status,
      })),
      quickStats,
      activeRules,
    })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch dashboard")
    return res.status(500).json({ error: "Failed to fetch dashboard data" })
  }
})

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`
  }
  return `$${amount.toFixed(2)}`
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

function getIconForEvent(event: string): string {
  const iconMap: Record<string, string> = {
    "rule.created": "rule",
    "rule.updated": "rule",
    "rule.deleted": "delete",
    "store.connected": "store",
    "store.disconnected": "store",
    "order.synced": "sync",
    "order.refunded": "payments",
    "order.flagged": "flag",
  }
  return iconMap[event] || "history"
}

export default router
