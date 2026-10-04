import { detectIntent, IntentResult, ChatIntent } from "./chatbot"
import { getStoreContext, StoreContext } from "./store-context"
import { ShopifyService } from "./shopify"
import { RulesEngine } from "./rules-engine"
import { getDb } from "../config/database"
import { chatSessions, chatMessages, stores, orders, rules, actionLogs } from "../models/schema"
import { eq, and, desc } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "conversation" })

export interface ConversationState {
  sessionId: string
  currentStep: string
  orderNumber?: string
  orderId?: string
  selectedItem?: string
  returnReason?: string
  preferredAction?: string
  collectedData: Record<string, any>
}

interface ChatResponse {
  message: string
  intent: string
  sessionId: string
  actions: Array<{ type: string; status: string; details?: any }>
  nextStep?: string
}

const RETURN_FLOW_STEPS = {
  START: "start",
  ASK_ORDER: "ask_order",
  ASK_ITEMS: "ask_items",
  ASK_REASON: "ask_reason",
  ASK_ACTION: "ask_action",
  CONFIRM: "confirm",
  PROCESSING: "processing",
  COMPLETE: "complete",
} as const

export async function processMessage(
  storeId: string,
  message: string,
  conversationId?: string,
  customerEmail?: string,
  customerName?: string
): Promise<ChatResponse> {
  const db = getDb()

  let session: any = null
  if (conversationId) {
    const [existing] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, conversationId))
      .limit(1)
    session = existing
  }

  if (!session) {
    const [newSession] = await db
      .insert(chatSessions)
      .values({
        storeId,
        customerEmail: customerEmail || null,
        customerName: customerName || null,
        status: "active",
        context: { currentStep: RETURN_FLOW_STEPS.START },
      })
      .returning()
    session = newSession
  }

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(chatMessages.createdAt)
    .limit(20)

  const intentResult = await detectIntent(
    message,
    history.map((h: any) => ({ role: h.role, content: h.content }))
  )

  const storeContext = await getStoreContext(storeId)

  const response = await handleIntent(
    intentResult,
    message,
    session,
    storeContext,
    storeId
  )

  await db.insert(chatMessages).values({
    sessionId: session.id,
    role: "customer",
    content: message,
    intent: intentResult.intent,
    entities: intentResult.entities,
  })

  await db.insert(chatMessages).values({
    sessionId: session.id,
    role: "bot",
    content: response.message,
    actions: response.actions,
  })

  const sessionContext = (session.context as any) || {}
  sessionContext.currentStep = response.nextStep || sessionContext.currentStep || "idle"
  if (intentResult.entities.orderNumber) {
    sessionContext.orderNumber = intentResult.entities.orderNumber
  }
  if (intentResult.entities.returnReason) {
    sessionContext.returnReason = intentResult.entities.returnReason
  }
  if (intentResult.entities.preferredAction) {
    sessionContext.preferredAction = intentResult.entities.preferredAction
  }

  await db
    .update(chatSessions)
    .set({
      context: sessionContext,
      intent: intentResult.intent,
      lastMessageAt: new Date().toISOString(),
      customerEmail: customerEmail || session.customerEmail,
    })
    .where(eq(chatSessions.id, session.id))

  return {
    message: response.message,
    intent: intentResult.intent,
    sessionId: session.id,
    actions: response.actions,
    nextStep: response.nextStep,
  }
}

async function handleIntent(
  intentResult: IntentResult,
  message: string,
  session: any,
  storeContext: StoreContext | null,
  storeId: string
): Promise<ChatResponse> {
  const { intent, entities } = intentResult
  const sessionContext = (session.context as any) || {}
  const currentStep = sessionContext.currentStep || RETURN_FLOW_STEPS.START

  if (
    (currentStep === RETURN_FLOW_STEPS.ASK_ORDER ||
      currentStep === RETURN_FLOW_STEPS.ASK_ITEMS ||
      currentStep === RETURN_FLOW_STEPS.ASK_REASON ||
      currentStep === RETURN_FLOW_STEPS.ASK_ACTION ||
      currentStep === RETURN_FLOW_STEPS.CONFIRM) &&
    (sessionContext.flow === "return" || sessionContext.flow === "exchange")
  ) {
    return handleReturnFlowStep(message, session, sessionContext, storeContext, storeId)
  }

  switch (intent) {
    case "greeting":
      return {
        message: `Hello! Welcome to ${storeContext?.storeName || "our store"}! 👋 I can help you with:\n• Order tracking\n• Returns & exchanges\n• Product questions\n• Store policies\n\nHow can I help you today?`,
        intent,
        sessionId: session.id,
        actions: [],
        nextStep: "idle",
      }

    case "order_lookup":
      return handleOrderLookup(entities, session, storeContext, storeId)

    case "return_request":
      return startReturnFlow(session, sessionContext, "return", entities, storeContext)

    case "exchange_request":
      return startReturnFlow(session, sessionContext, "exchange", entities, storeContext)

    case "product_question":
      return handleProductQuestion(entities, storeContext)

    case "policy_question":
      return handlePolicyQuestion(storeContext)

    case "shipping_question":
      return handleShippingQuestion(storeContext)

    case "complaint":
      return {
        message: "I'm sorry to hear you're experiencing an issue. I'd like to help resolve this right away. Could you please share your order number so I can look into it?",
        intent,
        sessionId: session.id,
        actions: [],
        nextStep: "ask_order",
      }

    case "thank_you":
      return {
        message: "You're welcome! Is there anything else I can help you with? 😊",
        intent,
        sessionId: session.id,
        actions: [],
        nextStep: "idle",
      }

    case "goodbye":
      return {
        message: "Goodbye! Thank you for contacting us. Have a great day! 👋",
        intent,
        sessionId: session.id,
        actions: [],
        nextStep: "idle",
      }

    default:
      return {
        message: intentResult.suggestedResponse || "I'd be happy to help! Could you please provide more details?",
        intent,
        sessionId: session.id,
        actions: [],
        nextStep: "idle",
      }
  }
}

async function handleOrderLookup(
  entities: any,
  session: any,
  storeContext: StoreContext | null,
  storeId: string
): Promise<ChatResponse> {
  const actions: ChatResponse["actions"] = []

  if (!entities.orderNumber && !entities.customerEmail) {
    return {
      message: "I can help you check your order. Could you please share your order number (e.g., #12345) or the email address you used for the order?",
      intent: "order_lookup",
      sessionId: session.id,
      actions,
      nextStep: "ask_order",
    }
  }

  const db = getDb()
  let order = null

  if (entities.orderNumber) {
    const [found] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.orderId, entities.orderNumber.replace(/^#/, "")),
        eq(orders.storeId, storeId)
      ))
      .limit(1)
    order = found
  }

  if (!order && entities.customerEmail) {
    const [found] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.customerEmail, entities.customerEmail),
        eq(orders.storeId, storeId)
      ))
      .orderBy(desc(orders.createdAt))
      .limit(1)
    order = found
  }

  if (!order && entities.orderNumber && storeContext?.platform === "shopify") {
    const store = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
    if (store[0]) {
      const shopify = new ShopifyService(store[0].domain, store[0].accessToken)
      const shopifyOrder = await shopify.findByOrderNumber(entities.orderNumber)
      if (shopifyOrder) {
        actions.push({ type: "shopify_order_lookup", status: "success", details: { orderId: shopifyOrder.id } })
        return {
          message: `I found your order **${shopifyOrder.name}**!\n\n📦 **Status:** ${shopifyOrder.financial_status}\n🚚 **Fulfillment:** ${shopifyOrder.fulfillment_status || "Not fulfilled"}\n💰 **Total:** Rs.${shopifyOrder.total_price}\n\nIs there anything else you'd like to know about this order?`,
          intent: "order_lookup",
          sessionId: session.id,
          actions,
          nextStep: "idle",
        }
      }
    }
  }

  if (order) {
    return {
      message: `I found your order **${order.orderNumber || order.orderId}**!\n\n📦 **Status:** ${order.status}\n🚚 **Fulfillment:** ${order.fulfillmentStatus || "Not fulfilled"}\n💰 **Total:** Rs.${order.totalAmount}\n\nIs there anything else you'd like to know?`,
      intent: "order_lookup",
      sessionId: session.id,
      actions,
      nextStep: "idle",
    }
  }

  return {
    message: "I couldn't find an order with that number. Could you please double-check the order number or share the email address you used?",
    intent: "order_lookup",
    sessionId: session.id,
    actions,
    nextStep: "ask_order",
  }
}

function startReturnFlow(
  session: any,
  sessionContext: any,
  flow: "return" | "exchange",
  entities: any,
  storeContext: StoreContext | null
): ChatResponse {
  const newContext = {
    ...sessionContext,
    flow,
    currentStep: entities.orderNumber ? RETURN_FLOW_STEPS.ASK_ITEMS : RETURN_FLOW_STEPS.ASK_ORDER,
    orderNumber: entities.orderNumber,
    returnReason: entities.returnReason,
    preferredAction: entities.preferredAction,
  }

  session.context = newContext

  if (entities.orderNumber) {
    return {
      message: `Great! I'll help you with ${flow === "return" ? "a return" : "an exchange"} for order **${entities.orderNumber}**.\n\nWhich items would you like to ${flow === "return" ? "return" : "exchange"}?`,
      intent: flow === "return" ? "return_request" : "exchange_request",
      sessionId: session.id,
      actions: [{ type: "flow_started", status: "success", details: { flow } }],
      nextStep: RETURN_FLOW_STEPS.ASK_ITEMS,
    }
  }

  return {
    message: `I'd be happy to help you with ${flow === "return" ? "a return" : "an exchange"}! 😊\n\nCould you please share your **order number** to get started?`,
    intent: flow === "return" ? "return_request" : "exchange_request",
    sessionId: session.id,
    actions: [{ type: "flow_started", status: "success", details: { flow } }],
    nextStep: RETURN_FLOW_STEPS.ASK_ORDER,
  }
}

async function handleReturnFlowStep(
  message: string,
  session: any,
  sessionContext: any,
  storeContext: StoreContext | null,
  storeId: string
): Promise<ChatResponse> {
  const currentStep = sessionContext.currentStep
  const flow = sessionContext.flow || "return"

  switch (currentStep) {
    case RETURN_FLOW_STEPS.ASK_ORDER: {
      const orderMatch = message.match(/#?(\d{4,8})/)
      const orderNumber = orderMatch?.[1]
      if (orderNumber) {
        sessionContext.orderNumber = orderNumber
        sessionContext.currentStep = RETURN_FLOW_STEPS.ASK_ITEMS
        return {
          message: `Got it! Order **${orderNumber}**. Which items would you like to ${flow === "return" ? "return" : "exchange"}?`,
          intent: flow === "return" ? "return_request" : "exchange_request",
          sessionId: session.id,
          actions: [],
          nextStep: RETURN_FLOW_STEPS.ASK_ITEMS,
        }
      }
      return {
        message: "Could you please share your order number? It usually looks like #12345.",
        intent: flow === "return" ? "return_request" : "exchange_request",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.ASK_ORDER,
      }
    }

    case RETURN_FLOW_STEPS.ASK_ITEMS: {
      sessionContext.selectedItem = message
      sessionContext.currentStep = RETURN_FLOW_STEPS.ASK_REASON
      return {
        message: `Noted — you want to ${flow === "return" ? "return" : "exchange"} **${message}**.\n\nWhat's the reason for ${flow === "return" ? "the return" : "the exchange"}?`,
        intent: flow === "return" ? "return_request" : "exchange_request",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.ASK_REASON,
      }
    }

    case RETURN_FLOW_STEPS.ASK_REASON: {
      sessionContext.returnReason = message
      sessionContext.currentStep = RETURN_FLOW_STEPS.ASK_ACTION

      if (flow === "exchange") {
        sessionContext.currentStep = RETURN_FLOW_STEPS.CONFIRM
        return {
          message: `So to confirm:\n\n📦 **Order:** ${sessionContext.orderNumber}\n👕 **Item:** ${sessionContext.selectedItem}\n📝 **Reason:** ${message}\n🔄 **Action:** Exchange\n\nShall I proceed with the exchange request? (Yes/No)`,
          intent: "exchange_request",
          sessionId: session.id,
          actions: [],
          nextStep: RETURN_FLOW_STEPS.CONFIRM,
        }
      }

      return {
        message: `Thank you. Would you prefer a **refund**, **exchange**, or **store credit**?`,
        intent: "return_request",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.ASK_ACTION,
      }
    }

    case RETURN_FLOW_STEPS.ASK_ACTION: {
      const lower = message.toLowerCase()
      let action = "refund"
      if (/(exchange|badal)/.test(lower)) action = "exchange"
      else if (/(store credit|credit|wallet)/.test(lower)) action = "store_credit"

      sessionContext.preferredAction = action
      sessionContext.currentStep = RETURN_FLOW_STEPS.CONFIRM

      return {
        message: `So to confirm:\n\n📦 **Order:** ${sessionContext.orderNumber}\n👕 **Item:** ${sessionContext.selectedItem}\n📝 **Reason:** ${sessionContext.returnReason}\n💰 **Action:** ${action.replace("_", " ")}\n\nShall I proceed? (Yes/No)`,
        intent: "return_request",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.CONFIRM,
      }
    }

    case RETURN_FLOW_STEPS.CONFIRM: {
      const lower = message.toLowerCase()
      if (/(yes|haan|confirm|proceed|kar do|bilkul)/.test(lower)) {
        sessionContext.currentStep = RETURN_FLOW_STEPS.PROCESSING

        const actions: ChatResponse["actions"] = []
        const ruleResult = await checkRulesForReturn(sessionContext, storeId, storeContext)
        actions.push(ruleResult)

        const decision = ruleResult.details?.decision

        if (decision === "auto_approve") {
          sessionContext.currentStep = RETURN_FLOW_STEPS.COMPLETE
          return {
            message: `✅ **${flow === "return" ? "Return" : "Exchange"} request approved!**\n\nYour request has been processed automatically. ${flow === "return" ? "You'll receive your refund within 5-7 business days." : "We'll contact you shortly with exchange details."}\n\nIs there anything else I can help you with?`,
            intent: flow === "return" ? "return_request" : "exchange_request",
            sessionId: session.id,
            actions,
            nextStep: RETURN_FLOW_STEPS.COMPLETE,
          }
        }

        if (decision === "auto_deny") {
          sessionContext.currentStep = RETURN_FLOW_STEPS.COMPLETE
          return {
            message: `❌ I'm sorry, but this ${flow} request doesn't meet our current policy requirements.\n\nIf you believe this is an error, please contact our support team.\n\nIs there anything else I can help you with?`,
            intent: flow === "return" ? "return_request" : "exchange_request",
            sessionId: session.id,
            actions,
            nextStep: RETURN_FLOW_STEPS.COMPLETE,
          }
        }

        if (decision === "refund_processed") {
          sessionContext.currentStep = RETURN_FLOW_STEPS.COMPLETE
          const emailSent = ruleResult.details?.emailSent === true
          const isMock = ruleResult.details?.mock === true
          const emailNote = emailSent
            ? "A confirmation email has been sent."
            : isMock
              ? "Note: This was a mock refund (no live Shopify connection) — no email was sent."
              : "No email was sent (no customer email on file or email delivery failed)."
          return {
            message: `✅ **Refund processed successfully!**\n\nYour refund for order **${sessionContext.orderNumber}** has been processed. You'll receive it within 5-7 business days. ${emailNote}\n\nIs there anything else I can help you with?`,
            intent: "return_request",
            sessionId: session.id,
            actions,
            nextStep: RETURN_FLOW_STEPS.COMPLETE,
          }
        }

        sessionContext.currentStep = RETURN_FLOW_STEPS.COMPLETE
        return {
          message: `📝 **${flow === "return" ? "Return" : "Exchange"} request submitted!**\n\nYour request has been sent for review. Our team will process it shortly and notify you via email.\n\n**Request Details:**\n• Order: ${sessionContext.orderNumber}\n• Item: ${sessionContext.selectedItem}\n• Reason: ${sessionContext.returnReason}\n\nIs there anything else I can help you with?`,
          intent: flow === "return" ? "return_request" : "exchange_request",
          sessionId: session.id,
          actions,
          nextStep: RETURN_FLOW_STEPS.COMPLETE,
        }
      }

      return {
        message: "No problem. Would you like to make any changes to your request, or shall I cancel it?",
        intent: flow === "return" ? "return_request" : "exchange_request",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.CONFIRM,
      }
    }

    default:
      return {
        message: "Let me help you with that. Could you please share your order number?",
        intent: "general_question",
        sessionId: session.id,
        actions: [],
        nextStep: RETURN_FLOW_STEPS.ASK_ORDER,
      }
  }
}

interface OrderLookupResult {
  order: any | null
  shopifyOrder: any | null
  storeRecord: any | null
}

async function lookupOrderForReturn(
  orderNumber: string,
  storeId: string,
  storeContext: StoreContext | null
): Promise<OrderLookupResult> {
  const db = getDb()
  const cleanNumber = orderNumber.replace(/^#/, "")

  // Try local DB first
  const [dbOrder] = await db
    .select()
    .from(orders)
    .where(and(
      eq(orders.orderId, cleanNumber),
      eq(orders.storeId, storeId)
    ))
    .limit(1)

  const [storeRecord] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)

  // Try Shopify directly if not in DB
  let shopifyOrder = null
  if (!dbOrder && storeRecord?.accessToken && storeRecord?.domain && storeContext?.platform !== "woocommerce") {
    try {
      const shopify = new ShopifyService(storeRecord.domain, storeRecord.accessToken)
      shopifyOrder = await shopify.findByOrderNumber(cleanNumber)
    } catch (err) {
      log.warn({ err, orderNumber }, "Shopify order lookup failed")
    }
  }

  return { order: dbOrder || null, shopifyOrder, storeRecord: storeRecord || null }
}

export async function checkRulesForReturn(
  context: any,
  storeId: string,
  storeContext: StoreContext | null
): Promise<{ type: string; status: string; details?: any }> {
  try {
    const db = getDb()
    const orderNumber = context.orderNumber || ""
    const returnReason = (context.returnReason || "").toLowerCase()
    const preferredAction = context.preferredAction || "refund"

    // Look up the order to get real amount data
    const { order, shopifyOrder, storeRecord } = await lookupOrderForReturn(orderNumber, storeId, storeContext)

    let orderAmount = parseFloat(context.orderAmount || "0")
    let orderCurrency = "PKR"
    let customerEmail = context.customerEmail || ""
    let customerId = order?.orderId || shopifyOrder?.id || orderNumber

    if (order) {
      orderAmount = parseFloat(order.totalAmount) || orderAmount
      customerEmail = order.customerEmail || customerEmail
    } else if (shopifyOrder) {
      orderAmount = parseFloat(shopifyOrder.total_price) || orderAmount
      orderCurrency = shopifyOrder.currency || orderCurrency
      customerEmail = shopifyOrder.email || shopifyOrder.customer?.email || customerEmail
    }

    // Load active rules for this store
    const storeRules = await db
      .select()
      .from(rules)
      .where(and(eq(rules.storeId, storeId), eq(rules.status, "active")))
      .orderBy(rules.priority)

    if (storeRules.length === 0) {
      await flagOrderForReview(orderNumber, storeId, context, orderAmount, orderCurrency, customerEmail, storeContext, order, shopifyOrder)
      return {
        type: "rule_check",
        status: "no_rules",
        details: { decision: "flag_for_review", reason: "No active rules configured" },
      }
    }

    // Build order data for rule evaluation
    const orderData: Record<string, any> = {
      orderId: customerId,
      orderNumber,
      amount: orderAmount,
      totalAmount: orderAmount,
      currency: orderCurrency,
      customerEmail,
      customerName: order?.customerName || shopifyOrder?.customer?.first_name || "",
      returnReason,
      reason: returnReason,
      preferredAction,
      financialStatus: order?.financialStatus || shopifyOrder?.financial_status || "paid",
      fulfillmentStatus: order?.fulfillmentStatus || shopifyOrder?.fulfillment_status || "unfulfilled",
      lineItems: order ? (typeof order.lineItems === "string" ? JSON.parse(order.lineItems) : order.lineItems) : (shopifyOrder?.line_items || []),
    }

    // Evaluate rules to find matching ones
    const matchingRules: any[] = []
    for (const rule of storeRules) {
      const conditions = rule.conditions as any[]
      const conditionResults = conditions.filter((c: any) => c.field && c.operator).map((c: any) => {
        const actual = orderData[c.field] ?? orderData[c.field === "reason" ? "returnReason" : c.field]
        const expected = c.value
        switch (c.operator) {
          case "equals": return String(actual).toLowerCase() === String(expected).toLowerCase()
          case "not_equals": return String(actual).toLowerCase() !== String(expected).toLowerCase()
          case "contains": return String(actual).toLowerCase().includes(String(expected).toLowerCase())
          case "not_contains": return !String(actual).toLowerCase().includes(String(expected).toLowerCase())
          case "greater_than": return Number(actual) > Number(expected)
          case "less_than": return Number(actual) < Number(expected)
          case "greater_than_or_equal": return Number(actual) >= Number(expected)
          case "less_than_or_equal": return Number(actual) <= Number(expected)
          case "is_set": return actual !== null && actual !== undefined && actual !== ""
          default: return true
        }
      })

      const logic = rule.logic || "all"
      const matched = conditionResults.length === 0
        ? true
        : logic === "all"
          ? conditionResults.every(Boolean)
          : conditionResults.some(Boolean)

      if (matched) {
        matchingRules.push(rule)
      }
    }

    if (matchingRules.length === 0) {
      await flagOrderForReview(orderNumber, storeId, context, orderAmount, orderCurrency, customerEmail, storeContext, order, shopifyOrder)
      return {
        type: "rule_check",
        status: "no_match",
        details: { decision: "flag_for_review", reason: "No matching rule found" },
      }
    }

    // Get store record for RulesEngine
    let shopifyService: ShopifyService | undefined
    let storeUserId = storeRecord?.userId || ""

    if (storeRecord?.accessToken && storeRecord?.domain && storeContext?.platform !== "woocommerce") {
      shopifyService = new ShopifyService(storeRecord.domain, storeRecord.accessToken)
    }

    // Execute the first matching rule through the real RulesEngine
    const rule = matchingRules[0]
    const engine = new RulesEngine(shopifyService, storeUserId, storeId)

    // Check if this is a refund-type action
    const ruleActions = rule.actions as any[]
    const isRefundRule = ruleActions.some((a: any) =>
      a.type?.includes("Auto-refund") || a.type?.includes("Instant refund") || a.type?.toLowerCase().includes("refund")
    )

    // Check duplicate prevention directly
    if (isRefundRule) {
      const existingAction = await db
        .select()
        .from(actionLogs)
        .where(and(
          eq(actionLogs.orderId, String(customerId)),
          eq(actionLogs.actionType, "Auto-refund"),
          eq(actionLogs.status, "success")
        ))
        .limit(1)

      if (existingAction.length > 0) {
        return {
          type: "rule_check",
          status: "duplicate",
          details: {
            decision: "flag_for_review",
            reason: "Duplicate refund already processed for this order",
            ruleName: rule.name,
          },
        }
      }
    }

    // Execute through RulesEngine (handles spend caps, high-value threshold, AI confidence)
    const result = await engine.executeWithAI(
      {
        id: rule.id,
        name: rule.name,
        description: rule.description || "",
        conditions: rule.conditions as any[],
        actions: rule.actions as any[],
      },
      orderData
    )

    // Determine what happened
    if (result.executed) {
      const executedAction = ruleActions[0]?.type || "Auto-refund"
      const isRefundExecuted = executedAction.toLowerCase().includes("refund") || executedAction.includes("Auto-refund") || executedAction.includes("Instant")

      if (isRefundExecuted) {
        // Email is handled by RulesEngine — only sent after REAL Shopify refund succeeds
        // result.emailSent tells us whether email was actually dispatched
        const emailMsg = result.emailSent
          ? "A confirmation email has been sent."
          : result.mock
            ? "Note: This is a mock refund (no live Shopify connection) — no email was sent."
            : "No email was sent (no customer email available or email failed)."

        return {
          type: "rule_check",
          status: "executed",
          details: {
            decision: "refund_processed",
            ruleName: rule.name,
            action: executedAction,
            amount: orderAmount,
            verified: result.verified,
            mock: result.mock,
            emailSent: result.emailSent,
            emailMessage: emailMsg,
          },
        }
      }

      // Non-refund action executed (exchange, flag, etc.)
      return {
        type: "rule_check",
        status: "executed",
        details: {
          decision: executedAction.toLowerCase().includes("deny") ? "auto_deny" : "auto_approve",
          ruleName: rule.name,
          action: executedAction,
          emailSent: result.emailSent,
        },
      }
    }

    // Rule engine did not execute — check the reason
    const reason = result.reason || "Rule execution skipped"
    let decision: string = "flag_for_review"

    if (reason.includes("Spend cap")) {
      decision = "flag_for_review"
    } else if (reason.includes("High-value")) {
      decision = "flag_for_review"
    } else if (reason.includes("Low AI confidence")) {
      decision = "flag_for_review"
    } else if (reason.includes("Duplicate")) {
      decision = "flag_for_review"
    }

    // Flag for review (creates order record for Approval Queue)
    await flagOrderForReview(orderNumber, storeId, context, orderAmount, orderCurrency, customerEmail, storeContext, order, shopifyOrder)

    return {
      type: "rule_check",
      status: "skipped",
      details: {
        decision,
        reason,
        ruleName: rule.name,
      },
    }
  } catch (error) {
    log.error({ err: error }, "Rule check failed")
    return {
      type: "rule_check",
      status: "error",
      details: { decision: "flag_for_review", reason: "Rule check error — request sent for manual review" },
    }
  }
}

async function flagOrderForReview(
  orderNumber: string,
  storeId: string,
  context: any,
  orderAmount: number,
  currency: string,
  customerEmail: string,
  storeContext: StoreContext | null,
  existingOrder: any | null,
  shopifyOrder: any | null
): Promise<void> {
  try {
    const db = getDb()

    // Get store owner
    const [storeRecord] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
    const userId = storeRecord?.userId
    if (!userId) return

    // If order already exists in DB, update its return status
    if (existingOrder) {
      await db
        .update(orders)
        .set({
          returnStatus: "pending",
          returnReason: context.returnReason || existingOrder.returnReason,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, existingOrder.id))
      return
    }

    // Create new order record for the Approval Queue
    const orderId = crypto.randomUUID()
    const cleanNumber = orderNumber.replace(/^#/, "")

    // Build line items from context or Shopify
    let lineItems = context.selectedItem
      ? [{ id: 1, title: context.selectedItem, quantity: 1, price: String(orderAmount), sku: "" }]
      : []

    if (shopifyOrder?.line_items && Array.isArray(shopifyOrder.line_items)) {
      lineItems = shopifyOrder.line_items.map((item: any) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku || "",
      }))
    }

    await db.insert(orders).values({
      id: orderId,
      userId,
      storeId,
      orderId: cleanNumber,
      orderNumber: orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`,
      customerEmail: customerEmail || null,
      customerName: shopifyOrder?.customer?.first_name ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name || ""}`.trim() : null,
      totalAmount: String(orderAmount),
      currency: currency || "PKR",
      status: "pending",
      financialStatus: shopifyOrder?.financial_status || "paid",
      fulfillmentStatus: shopifyOrder?.fulfillment_status || "unfulfilled",
      lineItems: JSON.stringify(lineItems),
      returnReason: context.returnReason || null,
      returnStatus: "pending",
      isFraud: "false",
      createdAt: new Date().toISOString(),
    })

    log.info({ orderNumber, storeId, amount: orderAmount }, "Order flagged for review via chat")
  } catch (error) {
    log.error({ err: error, orderNumber }, "Failed to flag order for review")
  }
}

async function handleProductQuestion(entities: any, storeContext: StoreContext | null): Promise<ChatResponse> {
  if (!storeContext?.products || storeContext.products.length === 0) {
    return {
      message: "I'd be happy to help with product questions! Could you tell me which product you're interested in?",
      intent: "product_question",
      sessionId: "",
      actions: [],
      nextStep: "idle",
    }
  }

  const query = (entities.productName || "").toLowerCase()
  const matching = storeContext.products.filter(p =>
    p.title.toLowerCase().includes(query) || query.includes(p.title.toLowerCase())
  )

  if (matching.length > 0) {
    const product = matching[0]
    return {
      message: `Here's what I found:\n\n**${product.title}**\n💰 Price: Rs.${product.price}\n📦 Stock: ${product.inStock ? "In Stock ✅" : "Out of Stock ❌"}\n\nWould you like to know anything else about this product?`,
      intent: "product_question",
      sessionId: "",
      actions: [{ type: "product_lookup", status: "success", details: { productId: product.id } }],
      nextStep: "idle",
    }
  }

  const sample = storeContext.products.slice(0, 5)
  return {
    message: `I couldn't find that exact product, but here are some items from our store:\n\n${sample.map(p => `• ${p.title} — Rs.${p.price}`).join("\n")}\n\nCould you try a different search term?`,
    intent: "product_question",
    sessionId: "",
    actions: [],
    nextStep: "idle",
  }
}

async function handlePolicyQuestion(storeContext: StoreContext | null): Promise<ChatResponse> {
  let message = "Here are our store policies:\n"

  if (storeContext?.policies?.refund) {
    message += `\n🔄 **Return Policy:**\n${storeContext.policies.refund.substring(0, 300)}...\n`
  } else {
    message += `\n🔄 **Returns:** Returns are accepted within 14 days of delivery. Items must be unused and in original packaging.\n`
  }

  if (storeContext?.policies?.shipping) {
    message += `\n🚚 **Shipping Policy:**\n${storeContext.policies.shipping.substring(0, 200)}...\n`
  } else {
    message += `\n🚚 **Shipping:** Standard delivery takes 3-5 business days within Pakistan.\n`
  }

  message += `\n\nDo you have a specific question about our policies?`

  return {
    message,
    intent: "policy_question",
    sessionId: "",
    actions: [{ type: "policy_lookup", status: "success" }],
    nextStep: "idle",
  }
}

async function handleShippingQuestion(storeContext: StoreContext | null): Promise<ChatResponse> {
  let message = "Here's our shipping information:\n\n"

  if (storeContext?.policies?.shipping) {
    message += `${storeContext.policies.shipping.substring(0, 300)}`
  } else {
    message += `🚚 **Delivery Time:**\n• Major cities (Karachi, Lahore, Islamabad): 2-4 business days\n• Other cities: 3-5 business days\n• Remote areas: 5-7 business days\n\n📦 **Shipping Cost:** Free shipping on orders above Rs.5,000`
  }

  message += `\n\nDo you have a specific shipping question?`

  return {
    message,
    intent: "shipping_question",
    sessionId: "",
    actions: [],
    nextStep: "idle",
  }
}
