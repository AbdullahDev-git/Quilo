import { Router, Response } from "express"
import { getDb } from "../config/database"
import { orders, rules, stores } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq } from "drizzle-orm"
import { validate } from "../middleware/validate"
import { createContextLogger } from "../config/logger"
import { generateRule, analyzeOrder, suggestRules, editRule } from "../services/ai"
import { config } from "../config"
import { z } from "zod"

const log = createContextLogger({ module: "ai" })
const router = Router()

router.use(authenticate)

const generateRuleSchema = z.object({
  prompt: z.string().min(10, "Please describe the rule you want to create").max(2000),
})

const analyzeOrderSchema = z.object({
  orderId: z.string().uuid(),
})

const editRuleSchema = z.object({
  ruleId: z.string().uuid(),
  instruction: z.string().min(5, "Please describe the change").max(2000),
})

router.post("/generate-rule", validate(generateRuleSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!config.googleAI.apiKey) {
      return res.status(503).json({ error: "AI service not configured" })
    }

    const { prompt } = req.body
    const rule = await generateRule(prompt)

    log.info({ userId: req.userId, prompt: prompt.substring(0, 100) }, "Rule generated")
    return res.json(rule)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found")) {
      return res.status(503).json({ error: "AI model not available", detail: msg })
    }
    log.error({ err: error, userId: req.userId }, "Failed to generate rule")
    return res.status(500).json({ error: "Failed to generate rule", detail: msg })
  }
})

router.post("/analyze-order", validate(analyzeOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!config.googleAI.apiKey) {
      return res.status(503).json({ error: "AI service not configured" })
    }

    const { orderId } = req.body

    const [order] = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    const analysis = await analyzeOrder({
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      currency: order.currency,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      lineItems: order.lineItems,
      returnReason: order.returnReason,
      createdAt: order.createdAt,
    })

    log.info({ orderId, riskScore: analysis.riskScore }, "Order analyzed")
    return res.json(analysis)
  } catch (error) {
    log.error({ err: error, orderId: req.body.orderId }, "Failed to analyze order")
    return res.status(500).json({ error: "Failed to analyze order" })
  }
})

router.post("/suggest-rules", async (req: AuthRequest, res: Response) => {
  try {
    if (!config.googleAI.apiKey) {
      return res.status(503).json({ error: "AI service not configured" })
    }

    const userId = req.userId!

    const [userOrders, userRules] = await Promise.all([
      getDb().select().from(orders).where(eq(orders.userId, userId)),
      getDb().select().from(rules).where(eq(rules.userId, userId)),
    ])

    const totalOrders = userOrders.length
    const returnedOrders = userOrders.filter(o => o.returnStatus === "approved" || o.returnStatus === "auto_approved")
    const returnRate = totalOrders > 0 ? returnedOrders.length / totalOrders : 0
    const avgOrderValue = totalOrders > 0
      ? userOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0) / totalOrders
      : 0

    const returnReasons = userOrders
      .filter(o => o.returnReason)
      .reduce((acc, o) => {
        acc[o.returnReason!] = (acc[o.returnReason!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topReturnReasons = Object.entries(returnReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason)

    const suggestions = await suggestRules({
      totalOrders,
      returnRate,
      averageOrderValue: avgOrderValue,
      topReturnReasons,
      existingRules: userRules.map(r => r.name),
    })

    log.info({ userId, count: suggestions.length }, "Rule suggestions generated")
    return res.json(suggestions)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found")) {
      return res.status(503).json({ error: "AI model not available", detail: msg })
    }
    log.error({ err: error, userId: req.userId }, "Failed to suggest rules")
    return res.status(500).json({ error: "Failed to suggest rules", detail: msg })
  }
})

router.post("/edit-rule", validate(editRuleSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!config.googleAI.apiKey) {
      return res.status(503).json({ error: "AI service not configured" })
    }

    const { ruleId, instruction } = req.body

    const [rule] = await getDb()
      .select()
      .from(rules)
      .where(eq(rules.id, ruleId))
      .limit(1)

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" })
    }

    const updatedRule = await editRule(
      {
        name: rule.name,
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions,
        logic: rule.logic,
      },
      instruction
    )

    log.info({ ruleId, userId: req.userId }, "Rule edited via AI")
    return res.json(updatedRule)
  } catch (error) {
    log.error({ err: error, ruleId: req.body.ruleId }, "Failed to edit rule")
    return res.status(500).json({ error: "Failed to edit rule" })
  }
})

export default router
