import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, rules, stores, actionLogs } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and, gte, lt, sql, count, sum } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "analytics" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
    const chartGroup = req.query.chart === "weekly" ? "weekly" : "daily"

    const db = getDb()
    const userId = req.userId!

    // Current period
    const currentStart = new Date()
    currentStart.setDate(currentStart.getDate() - days)
    const currentStartIso = currentStart.toISOString()

    // Previous period (for comparison)
    const previousStart = new Date(currentStart)
    previousStart.setDate(previousStart.getDate() - days)
    const previousStartIso = previousStart.toISOString()

    // --- Current period orders ---
    const currentOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), gte(orders.createdAt, currentStartIso)))

    // --- Previous period orders ---
    const previousOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), gte(orders.createdAt, previousStartIso), lt(orders.createdAt, currentStartIso)))

    // --- All-time counts ---
    const [allTimeOrders] = await db.select({ value: count() }).from(orders).where(eq(orders.userId, userId))
    const [activeRulesCount] = await db.select({ value: count() }).from(rules).where(and(eq(rules.userId, userId), eq(rules.status, "active")))
    const [storeCount] = await db.select({ value: count() }).from(stores).where(eq(stores.userId, userId))

    // --- Action logs for return distribution + performance ---
    const periodActionLogs = await db
      .select()
      .from(actionLogs)
      .where(and(eq(actionLogs.userId, userId), gte(actionLogs.createdAt, currentStartIso)))

    // --- Core metrics from current period orders ---
    const totalOrders = currentOrders.length
    const autoApproved = currentOrders.filter((o) => o.returnStatus === "auto_approved").length
    const refunded = currentOrders.filter((o) => o.status === "refunded").length
    const flagged = currentOrders.filter((o) => o.isFraud === "true" || o.returnStatus === "flagged").length
    const pending = currentOrders.filter((o) => o.returnStatus === "pending").length

    // Margin protected: auto-approved orders + refunded orders (money that was at risk)
    const marginProtectedCurrent = currentOrders
      .filter((o) => o.returnStatus === "auto_approved" || o.status === "refunded")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)

    const marginProtectedPrevious = previousOrders
      .filter((o) => o.returnStatus === "auto_approved" || o.status === "refunded")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)

    // Real margin change %
    const marginChange = marginProtectedPrevious > 0
      ? (((marginProtectedCurrent - marginProtectedPrevious) / marginProtectedPrevious) * 100)
      : marginProtectedCurrent > 0 ? 100 : 0

    // Return distribution from action_logs (accurate mapping, case-insensitive)
    const actionTypeLower = (a: string) => a.toLowerCase()
    const exchangeActions = periodActionLogs.filter((a) => {
      const t = actionTypeLower(a.actionType)
      return t.includes("exchange")
    })
    const storeCreditActions = periodActionLogs.filter((a) => {
      const t = actionTypeLower(a.actionType)
      return t.includes("store_credit") || t.includes("store credit") || t.includes("discount") || t.includes("credit")
    })
    const refundActions = periodActionLogs.filter((a) => {
      const t = actionTypeLower(a.actionType)
      return t.includes("refund")
    })
    const flagActions = periodActionLogs.filter((a) => {
      const t = actionTypeLower(a.actionType)
      return t.includes("flag") || t.includes("review") || t.includes("escalate") || t.includes("manual")
    })

    // Fallback to order statuses if no action logs
    const useActionLogs = periodActionLogs.length > 0
    const exchangeCount = useActionLogs ? exchangeActions.length : autoApproved
    const storeCreditCount = useActionLogs ? storeCreditActions.length : pending
    const refundCount = useActionLogs ? refundActions.length : refunded
    const flaggedCount = useActionLogs ? flagActions.length : flagged

    const totalReturnUnits = exchangeCount + storeCreditCount + refundCount + flaggedCount || 1

    const exchangeRate = (exchangeCount / totalReturnUnits) * 100
    const storeCreditRate = (storeCreditCount / totalReturnUnits) * 100
    const refundRate = (refundCount / totalReturnUnits) * 100
    const flaggedRate = (flaggedCount / totalReturnUnits) * 100

    // Net retention value: money kept via exchanges + store credits (not refunds)
    const netRetentionValue = currentOrders
      .filter((o) => o.returnStatus === "auto_approved" && o.status !== "refunded")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)

    // --- Profit recovery time-series ---
    // Group orders by day/week within current period
    const groupFormat = chartGroup === "weekly" ? "IYYY-IW" : "YYYY-MM-DD"
    const recoveryRows = await db
      .select({
        period: sql<string>`to_char(date(${orders.createdAt}), ${groupFormat})`.as("period"),
        amount: sql<string>`coalesce(sum(${orders.totalAmount}::numeric), 0)`.as("amount"),
        count: count(),
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), gte(orders.createdAt, currentStartIso)))
      .groupBy(sql`to_char(date(${orders.createdAt}), ${groupFormat})`)
      .orderBy(sql`to_char(date(${orders.createdAt}), ${groupFormat})`)

    // Fill gaps with zeros
    const recoveryMap = new Map<string, { actual: number; count: number }>()
    recoveryRows.forEach((r) => {
      recoveryMap.set(r.period, { actual: parseFloat(r.amount), count: r.count })
    })

    const profitRecovery: { day: string; actual: number; projected: number; count: number }[] = []
    const cursor = new Date(currentStart)
    while (cursor <= new Date()) {
      let key: string
      let label: string
      if (chartGroup === "weekly") {
        const temp = new Date(cursor)
        // ISO week label
        const jan1 = new Date(temp.getFullYear(), 0, 1)
        const week = Math.ceil(((temp.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
        key = `${temp.getFullYear()}-W${String(week).padStart(2, "0")}`
        label = `W${week}`
      } else {
        key = cursor.toISOString().slice(0, 10)
        label = cursor.toLocaleDateString("en-US", { weekday: "short" })
      }

      const existing = recoveryMap.get(key)
      const actual = existing?.actual || 0
      // Projected = running average of actuals so far in period
      const avgSoFar = profitRecovery.length > 0
        ? profitRecovery.reduce((s, p) => s + p.actual, 0) / profitRecovery.length
        : actual

      profitRecovery.push({ day: label, actual: Math.round(actual), projected: Math.round(avgSoFar), count: existing?.count || 0 })

      cursor.setDate(cursor.getDate() + (chartGroup === "weekly" ? 7 : 1))
    }

    // --- Top returned products from line items ---
    const productMap = new Map<string, { name: string; sku: string; quantity: number; recovery: number }>()

    currentOrders.forEach((order) => {
      const lineItems = (order.lineItems as Array<{ title?: string; sku?: string; quantity?: number; price?: string }>) || []
      lineItems.forEach((item) => {
        const name = item.title || "Unknown Product"
        const sku = item.sku || "N/A"
        const key = `${name}::${sku}`
        const existing = productMap.get(key)
        if (existing) {
          existing.quantity += item.quantity || 1
          existing.recovery += parseFloat(item.price || "0") * (item.quantity || 1)
        } else {
          productMap.set(key, {
            name,
            sku,
            quantity: item.quantity || 1,
            recovery: parseFloat(item.price || "0") * (item.quantity || 1),
          })
        }
      })
    })

    const topReturnedProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)
      .map((p) => ({
        ...p,
        category: "General",
        returnRate: totalOrders > 0 ? ((p.quantity / totalOrders) * 100).toFixed(1) : "0.0",
      }))

    // --- Action performance from action_logs ---
    const totalActions = periodActionLogs.length
    const successfulActions = periodActionLogs.filter((a) => a.status === "success").length
    const failedActions = periodActionLogs.filter((a) => a.status === "failed").length
    const verifiedActions = periodActionLogs.filter((a) => a.verified === "true").length

    const actionPerformance = {
      total: totalActions,
      successful: successfulActions,
      failed: failedActions,
      verified: verifiedActions,
      successRate: totalActions > 0 ? ((successfulActions / totalActions) * 100).toFixed(1) : "0.0",
      verificationRate: successfulActions > 0 ? ((verifiedActions / successfulActions) * 100).toFixed(1) : "0.0",
      byType: [] as Array<{ type: string; count: number; success: number; failed: number }>,
    }

    // Group action logs by type
    const actionTypeMap = new Map<string, { count: number; success: number; failed: number }>()
    periodActionLogs.forEach((a) => {
      const existing = actionTypeMap.get(a.actionType) || { count: 0, success: 0, failed: 0 }
      existing.count++
      if (a.status === "success") existing.success++
      if (a.status === "failed") existing.failed++
      actionTypeMap.set(a.actionType, existing)
    })
    actionPerformance.byType = Array.from(actionTypeMap.entries())
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.count - a.count)

    return res.json({
      period: { days, start: currentStartIso, end: new Date().toISOString(), chart: chartGroup },
      totalMarginProtected: marginProtectedCurrent,
      marginChange: parseFloat(marginChange.toFixed(1)),
      previousMarginProtected: marginProtectedPrevious,
      exchangeRate: parseFloat(exchangeRate.toFixed(1)),
      netRetentionValue,
      returnDistribution: {
        exchange: parseFloat(exchangeRate.toFixed(1)),
        storeCredit: parseFloat(storeCreditRate.toFixed(1)),
        refund: parseFloat(refundRate.toFixed(1)),
        flagged: parseFloat(flaggedRate.toFixed(1)),
        totalUnits: totalReturnUnits,
        counts: { exchange: exchangeCount, storeCredit: storeCreditCount, refund: refundCount, flagged: flaggedCount },
      },
      profitRecovery,
      topReturnedProducts,
      actionPerformance,
      totalOrders: allTimeOrders.value,
      periodOrders: totalOrders,
      activeRules: activeRulesCount.value,
      connectedStores: storeCount.value,
    })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch analytics")
    return res.status(500).json({ error: "Failed to fetch analytics" })
  }
})

export default router
