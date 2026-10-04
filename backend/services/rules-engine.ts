import { ShopifyService } from "./shopify"
import { GoogleGenAI } from "@google/genai"
import { config } from "../config"
import { createContextLogger } from "../config/logger"
import { buildOrderNotificationEmail } from "./email"
import { addEmailJob, addWebhookDelivery } from "../jobs/queue"
import { getDb } from "../config/database"
import { actionLogs } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { checkRefundAllowed, recordRefund } from "./spend-caps"

const log = createContextLogger({ module: "rules-engine" })

interface Condition {
  field: string
  operator: string
  value: any
}

interface RuleAction {
  type: string
  config: Record<string, any>
}

let genai: GoogleGenAI | null = null

function getAI(): GoogleGenAI {
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: config.googleAI.apiKey })
  }
  return genai
}

interface AIDecision {
  action: string
  confidence: number
  reasoning: string
  adjustments?: Record<string, any>
}

export interface ActionResult {
  success: boolean
  verified: boolean
  mock: boolean
  emailSent: boolean
}

const HIGH_VALUE_THRESHOLD = 5000 // Rs. 5,000
const LOW_CONFIDENCE_THRESHOLD = 0.6 // 60%

export class RulesEngine {
  private shopify?: ShopifyService
  private userId?: string
  private storeId?: string

  constructor(shopify?: ShopifyService, userId?: string, storeId?: string) {
    this.shopify = shopify
    this.userId = userId
    this.storeId = storeId
  }

  evaluate(conditions: Condition[], data: Record<string, any>, logic: "all" | "any"): boolean {
    const results = conditions.filter((c) => c.field && c.operator).map((c) => this.evaluateCondition(c, data))
    if (results.length === 0) return true
    return logic === "all" ? results.every(Boolean) : results.some(Boolean)
  }

  private evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    const actual = data[condition.field]
    const expected = condition.value

    switch (condition.operator) {
      case "equals":
        return actual === expected
      case "not_equals":
        return actual !== expected
      case "greater_than":
        return Number(actual) > Number(expected)
      case "less_than":
        return Number(actual) < Number(expected)
      case "greater_than_or_equal":
        return Number(actual) >= Number(expected)
      case "less_than_or_equal":
        return Number(actual) <= Number(expected)
      case "contains":
        return String(actual).toLowerCase().includes(String(expected).toLowerCase())
      case "not_contains":
        return !String(actual).toLowerCase().includes(String(expected).toLowerCase())
      case "starts_with":
        return String(actual).toLowerCase().startsWith(String(expected).toLowerCase())
      case "ends_with":
        return String(actual).toLowerCase().endsWith(String(expected).toLowerCase())
      case "in":
        return Array.isArray(expected) && expected.includes(actual)
      case "not_in":
        return Array.isArray(expected) && !expected.includes(actual)
      case "between":
        return Array.isArray(expected) && expected.length === 2 &&
          Number(actual) >= Number(expected[0]) && Number(actual) <= Number(expected[1])
      case "is_set":
        return actual !== null && actual !== undefined && actual !== ""
      case "is_not_set":
        return actual === null || actual === undefined || actual === ""
      default:
        return false
    }
  }

  // Step 6: Check if action already executed for this order
  private async isDuplicateAction(orderId: string, actionType: string): Promise<boolean> {
    if (!this.userId) return false
    try {
      const db = getDb()
      const existing = await db
        .select()
        .from(actionLogs)
        .where(and(
          eq(actionLogs.userId, this.userId),
          eq(actionLogs.orderId, orderId),
          eq(actionLogs.actionType, actionType),
          eq(actionLogs.status, "success"),
        ))
        .limit(1)
      return existing.length > 0
    } catch {
      return false
    }
  }

  // Step 6: Log action for duplicate prevention + audit
  private async logAction(
    orderId: string,
    ruleId: string | undefined,
    ruleName: string | undefined,
    actionType: string,
    status: "pending" | "success" | "failed" | "skipped",
    verified: boolean = false,
    verificationData: any = null,
    errorMessage?: string
  ): Promise<void> {
    if (!this.userId) return
    try {
      const db = getDb()
      await db.insert(actionLogs).values({
        userId: this.userId,
        storeId: this.storeId,
        orderId,
        ruleId,
        ruleName,
        actionType,
        status,
        verified: verified ? "true" : "false",
        verificationData,
        errorMessage,
      })
    } catch (error) {
      log.error({ err: error, orderId, actionType }, "Failed to log action")
    }
  }

  // Step 4: Get AI decision with confidence check
  async makeAIDecision(
    rule: { name: string; description: string; conditions: Condition[]; actions: RuleAction[] },
    orderData: Record<string, any>
  ): Promise<AIDecision> {
    if (!config.googleAI.apiKey) {
      log.warn("AI not configured, using first action as default")
      return {
        action: rule.actions[0]?.type || "Flag for manual review",
        confidence: 0.5,
        reasoning: "AI not configured, defaulting to manual review",
      }
    }

    const client = getAI()

    const systemPrompt = `You are an AI decision engine for an e-commerce store automation platform.

A rule has been triggered by an order. Your job is to decide the best action based on the rule and order context.

RULE:
- Name: ${rule.name}
- Description: ${rule.description}
- Allowed actions: ${rule.actions.map(a => a.type).join(", ")}

AVAILABLE ACTIONS:
- Auto-refund: Process refund automatically
- Instant refund: Immediate refund
- Offer exchange: Offer store credit or exchange
- Flag for manual review: Flag for human review
- Auto-deny return: Deny the return
- Send email notification: Send notification email
- Fulfill order: Auto-fulfill
- Create discount: Generate discount code
- Update order tags: Add tags to order
- Send webhook: POST to external URL

DECISION RULES:
1. If the order is clearly legitimate and low-risk → approve (Auto-refund/Instant refund)
2. If there are mixed signals → offer alternatives (Offer exchange)
3. If high-risk or suspicious → flag for review or deny
4. Always consider: order amount, customer history, return reason, fraud indicators

Return ONLY valid JSON:
{
  "action": "chosen action type from allowed actions",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of decision",
  "adjustments": {}
}`

    const orderContext = {
      orderId: orderData.orderId || orderData.id,
      orderNumber: orderData.orderNumber,
      amount: orderData.amount || orderData.totalAmount,
      currency: orderData.currency,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      customerTier: orderData.customerTier || "standard",
      financialStatus: orderData.financialStatus,
      fulfillmentStatus: orderData.fulfillmentStatus,
      returnReason: orderData.returnReason || orderData.reason || orderData.note,
      itemCount: orderData.itemCount,
      billingCountry: orderData.billingCountry,
      shippingCountry: orderData.shippingCountry,
      tags: orderData.tags,
      orderAgeDays: orderData.order_age_days,
      inStock: orderData.in_stock,
      returnCount30d: orderData.return_count_30d,
      hasReceipt: orderData.has_receipt,
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
        contents: JSON.stringify(orderContext),
      })

      const text = response.text
      if (!text) {
        throw new Error("No AI response")
      }

      const decision = JSON.parse(text) as AIDecision

      log.info({
        ruleName: rule.name,
        orderId: orderContext.orderId,
        decision: decision.action,
        confidence: decision.confidence,
      }, "AI decision made")

      return decision
    } catch (error) {
      log.error({ err: error, ruleName: rule.name }, "AI decision failed, falling back to first action")
      return {
        action: rule.actions[0]?.type || "Flag for manual review",
        confidence: 0.3,
        reasoning: "AI decision failed, using default action",
      }
    }
  }

  // Step 3 + 4 + 5 + 6: Main execution with all safety checks
  async executeWithAI(
    rule: { id?: string; name: string; description: string; conditions: Condition[]; actions: RuleAction[] },
    orderData: Record<string, any>
  ): Promise<{ executed: boolean; reason?: string; verified?: boolean; mock?: boolean; emailSent?: boolean }> {
    const orderId = String(orderData.orderId || orderData.id || "")
    const orderAmount = Number(orderData.amount || orderData.totalAmount || 0)

    // Step 3: High-value threshold check
    const refundActions = ["Auto-refund", "Instant refund", "refund"]
    const isRefundAction = rule.actions.some(a => refundActions.includes(a.type))
    if (isRefundAction && orderAmount > HIGH_VALUE_THRESHOLD) {
      log.info({ orderId, amount: orderAmount, threshold: HIGH_VALUE_THRESHOLD }, "High-value refund detected, flagging for review")
      await this.logAction(orderId, rule.id, rule.name, "Auto-refund", "skipped", false, null, `High-value threshold: Rs.${orderAmount} > Rs.${HIGH_VALUE_THRESHOLD}`)
      const flagAction: RuleAction = { type: "Flag for manual review", config: { reason: `High-value refund (Rs.${orderAmount}) requires approval` } }
      await this.executeAction(flagAction, orderData, rule.id, rule.name)
      return { executed: false, reason: "High-value threshold triggered" }
    }

    // Step 3b: Spend cap check — shared central check for all refund paths
    if (isRefundAction && this.userId && this.storeId) {
      const capCheck = await checkRefundAllowed(this.userId, this.storeId, orderAmount)
      if (!capCheck.allowed) {
        log.info({ orderId, amount: orderAmount, remaining: capCheck.remaining }, "Spend cap would be exceeded, flagging for review")
        await this.logAction(orderId, rule.id, rule.name, "Auto-refund", "skipped", false, null, capCheck.reason || "Spend cap exceeded")
        const flagAction: RuleAction = { type: "Flag for manual review", config: { reason: capCheck.reason || "Spend cap exceeded — requires approval" } }
        await this.executeAction(flagAction, orderData, rule.id, rule.name)
        return { executed: false, reason: "Spend cap exceeded" }
      }
    }

    // Step 6: Duplicate prevention
    for (const action of rule.actions) {
      const isDuplicate = await this.isDuplicateAction(orderId, action.type)
      if (isDuplicate) {
        log.info({ orderId, actionType: action.type }, "Duplicate action prevented")
        await this.logAction(orderId, rule.id, rule.name, action.type, "skipped", false, null, "Duplicate action prevented")
        return { executed: false, reason: "Duplicate action prevented" }
      }
    }

    // Step 4: AI decision with confidence check
    const decision = await this.makeAIDecision(rule, orderData)

    // Step 4: Low confidence fallback
    if (decision.confidence < LOW_CONFIDENCE_THRESHOLD) {
      log.info({ orderId, confidence: decision.confidence, threshold: LOW_CONFIDENCE_THRESHOLD }, "Low AI confidence, flagging for manual review")
      await this.logAction(orderId, rule.id, rule.name, decision.action, "skipped", false, null, `Low AI confidence: ${decision.confidence}`)
      const flagAction: RuleAction = { type: "Flag for manual review", config: { reason: `AI confidence too low (${decision.confidence})` } }
      await this.executeAction(flagAction, orderData, rule.id, rule.name)
      return { executed: false, reason: "Low AI confidence" }
    }

    log.info({
      ruleName: rule.name,
      orderId,
      decision: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
    }, "Executing AI decision")

    const action: RuleAction = {
      type: decision.action,
      config: { ...rule.actions.find(a => a.type === decision.action)?.config, ...decision.adjustments },
    }

    const result = await this.executeAction(action, orderData, rule.id, rule.name)
    return { executed: result.success, verified: result.verified, mock: result.mock, emailSent: result.emailSent }
  }

  // Step 5 + 6: Execute action with verification and logging
  private async executeAction(
    action: RuleAction,
    data: Record<string, any>,
    ruleId?: string,
    ruleName?: string
  ): Promise<ActionResult> {
    const orderId = data.orderId || data.id
    const customerEmail = data.customerEmail || data.email

    try {
      switch (action.type) {
        case "Auto-refund":
        case "Instant refund": {
          if (this.shopify && orderId) {
            const refundNote = action.config.note || "Auto-refund processed by Quilo"
            const refundAmount = Number(data.amount || data.totalAmount || 0)
            const refundResult = await this.shopify.refundOrder(Number(orderId), data.amount, refundNote)

            if (refundResult.success) {
              // Step 5: Verify refund
              const verifyResult = await this.shopify.verifyRefund(Number(orderId))
              await this.shopify.addOrderTags(Number(orderId), ["auto_refund", "quilo_processed"])

              // Record refund against spend cap
              if (this.userId && this.storeId && refundAmount > 0) {
                await recordRefund(this.userId, this.storeId, refundAmount)
              }

              // Send email ONLY after real Shopify refund succeeded
              let emailSent = false
              if (customerEmail) {
                const emailContent = buildOrderNotificationEmail({
                  orderId: String(orderId),
                  action: "Refund Processed",
                  details: `Your refund of Rs.${data.amount || "full amount"} has been processed. You will receive it within 5-10 business days.`,
                })
                emailSent = await addEmailJob(customerEmail, emailContent.subject, emailContent.html)
              }

              await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", verifyResult.verified, verifyResult)
              log.info({ orderId, amount: data.amount, verified: verifyResult.verified, emailSent }, "Auto-refund processed and verified")
              return { success: true, verified: verifyResult.verified, mock: false, emailSent }
            } else {
              await this.logAction(String(orderId), ruleId, ruleName, action.type, "failed", false, null, refundResult.error)
              log.error({ orderId, error: refundResult.error }, "Auto-refund failed")
              return { success: false, verified: false, mock: false, emailSent: false }
            }
          } else {
            log.info({ orderId }, "[mock] Auto-refund processed (no Shopify connection)")
            // Record mock refund against spend cap
            const mockAmount = Number(data.amount || data.totalAmount || 0)
            if (this.userId && this.storeId && mockAmount > 0) {
              await recordRefund(this.userId, this.storeId, mockAmount)
            }
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", false, null, "Mock mode - no Shopify")
            // NO email in mock mode
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Offer exchange": {
          if (this.shopify && orderId) {
            const discountPct = action.config.discountPercent || 10
            const tagResult = await this.shopify.addOrderTags(Number(orderId), ["exchange_offered", `discount_${discountPct}`, "quilo_processed"])
            await this.shopify.addOrderNote(Number(orderId), `Exchange offered: ${discountPct}% discount for return`)
            let emailSent = false
            if (customerEmail) {
              const emailContent = buildOrderNotificationEmail({
                orderId: String(orderId),
                action: "Exchange Offered",
                details: `We'd like to offer you a ${discountPct}% discount as store credit instead of a refund. Contact us to accept this offer.`,
              })
              emailSent = await addEmailJob(customerEmail, emailContent.subject, emailContent.html)
            }
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", tagResult.success, tagResult)
            log.info({ orderId, discountPct }, "Exchange offered successfully")
            return { success: true, verified: tagResult.success, mock: false, emailSent }
          } else {
            log.info({ orderId }, "[mock] Exchange offered (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Flag for manual review": {
          if (this.shopify && orderId) {
            const tagResult = await this.shopify.addOrderTags(Number(orderId), ["manual_review", "quilo_needs_review"])
            await this.shopify.addOrderNote(Number(orderId), "Flagged by Quilo for manual review — requires human attention")
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", tagResult.success, tagResult)
            log.info({ orderId }, "Order flagged for manual review")
            return { success: true, verified: tagResult.success, mock: false, emailSent: false }
          } else {
            log.info({ orderId }, "[mock] Order flagged for review (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Auto-deny return": {
          if (this.shopify && orderId) {
            const denyReason = action.config.reason || "Return does not meet policy requirements"
            const tagResult = await this.shopify.addOrderTags(Number(orderId), ["return_denied", "quilo_denied"])
            await this.shopify.addOrderNote(Number(orderId), `Return denied: ${denyReason}`)
            let emailSent = false
            if (customerEmail) {
              const emailContent = buildOrderNotificationEmail({
                orderId: String(orderId),
                action: "Return Denied",
                details: `Your return request has been denied. Reason: ${denyReason}. If you believe this is an error, please contact support.`,
              })
              emailSent = await addEmailJob(customerEmail, emailContent.subject, emailContent.html)
            }
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", tagResult.success, tagResult)
            log.info({ orderId, reason: denyReason }, "Return denied successfully")
            return { success: true, verified: tagResult.success, mock: false, emailSent }
          } else {
            log.info({ orderId }, "[mock] Return denied (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Send email notification": {
          if (customerEmail) {
            const subject = action.config.subject || "Order Update from Quilo"
            const body = action.config.body || `Your order ${orderId} has been processed.`
            const emailContent = buildOrderNotificationEmail({
              orderId: String(orderId || "N/A"),
              action: subject,
              details: body,
            })
            const emailSent = await addEmailJob(customerEmail, emailContent.subject, emailContent.html)
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", true, { email: customerEmail })
            log.info({ email: customerEmail, orderId }, "Email notification sent")
            return { success: true, verified: true, mock: false, emailSent }
          } else {
            log.warn({ orderId }, "Cannot send email: no customer email available")
            return { success: false, verified: false, mock: false, emailSent: false }
          }
        }

        case "Fulfill order": {
          if (this.shopify && orderId) {
            const lineItems = data.lineItems || []
            if (lineItems.length > 0) {
              const fulfillResult = await this.shopify.fulfillOrder(
                Number(orderId),
                lineItems.map((item: any) => ({ id: item.id, quantity: item.quantity }))
              )
              await this.logAction(String(orderId), ruleId, ruleName, action.type, fulfillResult.success ? "success" : "failed", fulfillResult.success, fulfillResult)
              if (!fulfillResult.success) {
                log.error({ orderId, error: fulfillResult.error }, "Fulfill order failed")
                return { success: false, verified: false, mock: false, emailSent: false }
              }
            }
            await this.shopify.addOrderTags(Number(orderId), ["fulfilled", "quilo_fulfilled"])
            log.info({ orderId }, "Order fulfilled successfully")
            return { success: true, verified: true, mock: false, emailSent: false }
          } else {
            log.info({ orderId }, "[mock] Order fulfilled (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Create discount": {
          const discountCode = action.config.code || `QUILO_${Date.now().toString(36).toUpperCase()}`
          if (this.shopify) {
            const mutation = `
              mutation discountCodeCreate($input: DiscountCodeInput!) {
                discountCodeCreate(input: $input) {
                  userErrors { field message }
                  discountCode { code status }
                }
              }
            `
            await this.shopify.graphql<any>(mutation, {
              input: {
                code: discountCode,
                startsAt: new Date().toISOString(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                usageLimit: action.config.usageLimit || 100,
                appliesOncePerCustomer: true,
              },
            })
            let emailSent = false
            if (customerEmail) {
              const emailContent = buildOrderNotificationEmail({
                orderId: String(orderId || "N/A"),
                action: "Discount Created",
                details: `Use discount code **${discountCode}** at checkout for your next order. Valid for 30 days.`,
              })
              emailSent = await addEmailJob(customerEmail, emailContent.subject, emailContent.html)
            }
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", true, { discountCode })
            log.info({ discountCode, orderId }, "Discount created successfully")
            return { success: true, verified: true, mock: false, emailSent }
          } else {
            log.info({ discountCode }, "[mock] Discount created (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Update product": {
          const productId = action.config.productId
          const updates = action.config.updates || {}
          if (this.shopify && productId) {
            await this.shopify.updateProduct(Number(productId), updates)
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", true, { productId })
            log.info({ productId }, "Product updated successfully")
            return { success: true, verified: true, mock: false, emailSent: false }
          } else {
            log.info({ productId }, "[mock] Product updated (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        case "Send webhook": {
          const targetUrl = action.config.url || action.config.endpoint
          if (targetUrl) {
            const payload = {
              action: action.type,
              orderId: orderId,
              timestamp: new Date().toISOString(),
              data,
            }
            const delivered = await addWebhookDelivery(targetUrl, payload)
            await this.logAction(String(orderId), ruleId, ruleName, action.type, delivered ? "success" : "failed", delivered, { url: targetUrl })
            log.info({ url: targetUrl, orderId, delivered }, "Webhook " + (delivered ? "sent successfully" : "delivery failed"))
            return { success: delivered, verified: delivered, mock: false, emailSent: false }
          }
          return { success: false, verified: false, mock: false, emailSent: false }
        }

        case "Update order tags": {
          const tags = action.config.tags || []
          if (this.shopify && orderId && tags.length > 0) {
            const tagResult = await this.shopify.addOrderTags(Number(orderId), tags)
            await this.logAction(String(orderId), ruleId, ruleName, action.type, "success", tagResult.success, tagResult)
            log.info({ orderId, tags }, "Order tags updated successfully")
            return { success: true, verified: tagResult.success, mock: false, emailSent: false }
          } else {
            log.info({ orderId, tags }, "[mock] Order tags updated (no Shopify connection)")
            return { success: true, verified: false, mock: true, emailSent: false }
          }
        }

        default:
          log.warn({ actionType: action.type }, "Unknown action type")
          return { success: false, verified: false, mock: false, emailSent: false }
      }
    } catch (error) {
      await this.logAction(String(orderId), ruleId, ruleName, action.type, "failed", false, null, (error as Error).message)
      log.error({ err: error, actionType: action.type }, "Action failed")
      return { success: false, verified: false, mock: false, emailSent: false }
    }
  }
}
