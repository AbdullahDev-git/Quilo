import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, actionLogs } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and, count } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "customers" })
const router = Router()

router.use(authenticate)

// Step 7: Customer History Lookup + risk score
router.get("/:email/history", async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.params

    // Fetch all orders for this customer email
    const customerOrders = await getDb()
      .select()
      .from(orders)
      .where(and(
        eq(orders.userId, req.userId!),
        eq(orders.customerEmail, email.toLowerCase())
      ))
      .orderBy(orders.createdAt)

    // Fetch action logs for this customer's orders
    const orderIds = customerOrders.map(o => o.id)
    let actionHistory: any[] = []
    if (orderIds.length > 0) {
      const logs = await getDb()
        .select()
        .from(actionLogs)
        .where(and(
          eq(actionLogs.userId, req.userId!),
        ))
        .orderBy(actionLogs.createdAt)
      actionHistory = logs.filter(l => orderIds.includes(l.orderId))
    }

    // Calculate risk score (0-100, higher = more risk)
    let riskScore = 0
    const totalOrders = customerOrders.length
    const refundedOrders = customerOrders.filter(o => o.status === "refunded" || o.returnStatus === "approved").length
    const deniedOrders = customerOrders.filter(o => o.returnStatus === "rejected").length
    const flaggedOrders = customerOrders.filter(o => o.isFraud === "true").length
    const totalRefunded = customerOrders
      .filter(o => o.status === "refunded")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)

    if (totalOrders > 0) {
      // High refund rate
      const refundRate = refundedOrders / totalOrders
      riskScore += refundRate * 40 // up to 40 points
      // Flagged as fraud
      riskScore += flaggedOrders * 15 // 15 points each
      // High refund amount relative to orders
      const avgOrderValue = totalOrders > 0 ? customerOrders.reduce((s, o) => s + parseFloat(o.totalAmount || "0"), 0) / totalOrders : 0
      if (avgOrderValue > 0 && totalRefunded > avgOrderValue * 2) {
        riskScore += 20
      }
      // Many denied returns
      if (deniedOrders > 2) riskScore += 10
      // New customer with many returns
      if (totalOrders <= 3 && refundedOrders >= 2) riskScore += 15
    }

    riskScore = Math.min(100, Math.round(riskScore))

    const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low"

    // Build customer history
    const history = {
      email,
      totalOrders,
      refundedOrders,
      deniedOrders,
      flaggedOrders,
      totalRefunded: totalRefunded.toFixed(2),
      riskScore,
      riskLevel,
      orders: customerOrders.map(o => ({
        id: o.id,
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        status: o.status,
        returnStatus: o.returnStatus,
        returnReason: o.returnReason,
        isFraud: o.isFraud,
        createdAt: o.createdAt,
      })),
      actionHistory: actionHistory.map(l => ({
        actionType: l.actionType,
        status: l.status,
        ruleName: l.ruleName,
        createdAt: l.createdAt,
      })),
    }

    log.info({ email, riskScore, riskLevel, totalOrders }, "Customer history retrieved")
    return res.json(history)
  } catch (error) {
    log.error({ err: error, email: req.params.email }, "Failed to fetch customer history")
    return res.status(500).json({ error: "Failed to fetch customer history" })
  }
})

export default router
