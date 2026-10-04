import { GoogleGenAI } from "@google/genai"
import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "chatbot" })

let genai: GoogleGenAI | null = null

function getAI(): GoogleGenAI {
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: config.googleAI.apiKey })
  }
  return genai
}

export type ChatIntent =
  | "greeting"
  | "order_lookup"
  | "return_request"
  | "exchange_request"
  | "product_question"
  | "policy_question"
  | "shipping_question"
  | "general_question"
  | "complaint"
  | "thank_you"
  | "goodbye"
  | "unknown"

export interface ChatEntities {
  orderNumber?: string
  customerEmail?: string
  productName?: string
  returnReason?: string
  preferredAction?: "refund" | "exchange" | "store_credit"
  question?: string
}

export interface IntentResult {
  intent: ChatIntent
  entities: ChatEntities
  confidence: number
  suggestedResponse: string
}

const SYSTEM_PROMPT = `You are a customer support chatbot for an e-commerce store. Your job is to understand customer messages and extract intent + entities.

INTENTS (classify the customer's message into exactly ONE):
- "greeting": hello, hi, salam, asalam, hey, good morning/evening
- "order_lookup": asking about order status, tracking, "order #123", "mera order kahan hai"
- "return_request": wants to return something, "return karna hai", "refund chahiye", "wapas karna hai"
- "exchange_request": wants to exchange, "exchange karna hai", "size badalna hai", "doosra item chahiye"
- "product_question": asking about a product, price, availability, "ye item hai?", "price kya hai"
- "policy_question": asking about return policy, refund policy, "policy kya hai", "return kab tak ho sakta hai"
- "shipping_question": asking about shipping, delivery time, "kitne din mein aayega", "shipping kya hai"
- "complaint": unhappy, complaining, "problem hai", "galti hai", "bakwas hai"
- "thank_you": thanks, shukriya, thank you
- "goodbye": bye, alvida, khuda hafiz
- "general_question": anything else that doesn't fit above
- "unknown": couldn't understand

ENTITIES to extract when present:
- "orderNumber": order number like #12345, 12345, order-12345
- "customerEmail": email address
- "productName": product name mentioned
- "returnReason": reason for return (damaged, wrong size, not as described, changed mind, quality issue, etc.)
- "preferredAction": "refund" | "exchange" | "store_credit" if customer specifies preference
- "question": the actual question being asked

RESPONSE GUIDELINES:
- Be polite, friendly, concise
- Use simple English (Roman Urdu is fine if customer uses it)
- For order lookups, mention you'll need their order number if not provided
- For returns, ask for order number and reason if not provided
- Keep responses under 2-3 sentences

Return ONLY valid JSON:
{
  "intent": "one of the intents above",
  "entities": { ... extracted entities ... },
  "confidence": 0.0 to 1.0,
  "suggestedResponse": "a helpful response to send to the customer"
}`

export async function detectIntent(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<IntentResult> {
  if (!config.googleAI.apiKey) {
    log.warn("AI not configured, using fallback intent detection")
    return fallbackIntentDetection(message)
  }

  const client = getAI()

  // Build context with conversation history
  let contextPrefix = ""
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6) // Last 6 messages
    contextPrefix = "CONVERSATION HISTORY:\n" +
      recent.map(m => `${m.role}: ${m.content}`).join("\n") +
      "\n\nCURRENT MESSAGE:\n"
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
      contents: contextPrefix + message,
    })

    const text = response.text
    if (!text) {
      throw new Error("No AI response")
    }

    const result = JSON.parse(text) as IntentResult

    log.info({
      message: message.substring(0, 100),
      intent: result.intent,
      confidence: result.confidence,
    }, "Intent detected")

    return result
  } catch (error) {
    log.error({ err: error, message: message.substring(0, 100) }, "AI intent detection failed, using fallback")
    return fallbackIntentDetection(message)
  }
}

function fallbackIntentDetection(message: string): IntentResult {
  const lower = message.toLowerCase()

  // Extract order number
  const orderMatch = message.match(/#?(\d{4,8})/)
  const orderNumber = orderMatch?.[1]

  // Extract email
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/)
  const customerEmail = emailMatch?.[0]

  // Simple keyword-based intent detection
  if (/^(hi|hello|hey|salam|asalam|good (morning|afternoon|evening))/.test(lower)) {
    return {
      intent: "greeting",
      entities: { customerEmail },
      confidence: 0.9,
      suggestedResponse: "Hello! Welcome to our store. How can I help you today?",
    }
  }

  if (/(thank|shukriya)/.test(lower)) {
    return {
      intent: "thank_you",
      entities: {},
      confidence: 0.9,
      suggestedResponse: "You're welcome! Is there anything else I can help you with?",
    }
  }

  if (/(bye|alvida|khuda hafiz|goodbye)/.test(lower)) {
    return {
      intent: "goodbye",
      entities: {},
      confidence: 0.9,
      suggestedResponse: "Goodbye! Have a great day. Feel free to come back anytime.",
    }
  }

  if (/(order|tracking|status|kahan hai|deliver)/.test(lower) || orderNumber) {
    return {
      intent: "order_lookup",
      entities: { orderNumber, customerEmail },
      confidence: orderNumber ? 0.85 : 0.7,
      suggestedResponse: orderNumber
        ? "Let me check that order for you. One moment please."
        : "I can help you check your order. Could you please share your order number?",
    }
  }

  if (/(return|refund|wapas|wapsi)/.test(lower)) {
    const reason = extractReturnReason(lower)
    return {
      intent: "return_request",
      entities: { orderNumber, customerEmail, returnReason: reason },
      confidence: 0.8,
      suggestedResponse: "I can help you with a return. Could you please share your order number and let me know why you'd like to return the item?",
    }
  }

  if (/(exchange|badalna|doosra|size)/.test(lower)) {
    return {
      intent: "exchange_request",
      entities: { orderNumber, customerEmail },
      confidence: 0.8,
      suggestedResponse: "I can help you with an exchange. Please share your order number and let me know what you'd like to exchange.",
    }
  }

  if (/(price|kitne|paisa|cost|availability|stock|item|product|shirt|shoes)/.test(lower)) {
    return {
      intent: "product_question",
      entities: { productName: message },
      confidence: 0.6,
      suggestedResponse: "Let me check that for you. Could you tell me the exact product name or SKU?",
    }
  }

  if (/(policy|return kab|refund policy|terms)/.test(lower)) {
    return {
      intent: "policy_question",
      entities: { question: message },
      confidence: 0.8,
      suggestedResponse: "I'll check our store policy for you. Our return policy details are available on our website, or I can share the key points here.",
    }
  }

  if (/(shipping|delivery|deliver|kitne din|courier|post)/.test(lower)) {
    return {
      intent: "shipping_question",
      entities: { question: message },
      confidence: 0.8,
      suggestedResponse: "I can help with shipping questions. Delivery typically takes 3-5 business days within Pakistan. Do you have a specific order you're asking about?",
    }
  }

  if (/(problem|complaint|galti|bakwas|kharab|issue|not happy|disappointed)/.test(lower)) {
    return {
      intent: "complaint",
      entities: { orderNumber, customerEmail },
      confidence: 0.75,
      suggestedResponse: "I'm sorry to hear that. I'd like to help resolve this. Could you please share your order number and describe the issue?",
    }
  }

  return {
    intent: "general_question",
    entities: { question: message, customerEmail },
    confidence: 0.5,
    suggestedResponse: "I'd be happy to help! Could you please provide more details about your question?",
  }
}

function extractReturnReason(lowerMessage: string): string | undefined {
  if (/(damaged|kharab|toota|phata)/.test(lowerMessage)) return "damaged"
  if (/(wrong size|size galat|chota bara|fit nahi)/.test(lowerMessage)) return "wrong_size"
  if (/(not as described|alag hai|jaisa nahi)/.test(lowerMessage)) return "not_as_described"
  if (/(changed mind|man badal|nahi chahiye)/.test(lowerMessage)) return "changed_mind"
  if (/(quality|ghatiya|cheap)/.test(lowerMessage)) return "quality_issue"
  if (/(wrong item|galat item|doosra aya)/.test(lowerMessage)) return "wrong_item"
  if (/(late|deri|delay)/.test(lowerMessage)) return "late_delivery"
  return undefined
}

export function buildStorePrompt(storeContext: {
  storeName: string
  products?: Array<{ title: string; price: string; inStock: boolean }>
  policies?: { refund?: string; shipping?: string }
  returnPolicySummary?: string
}): string {
  let prompt = `STORE: ${storeContext.storeName}\n`

  if (storeContext.products && storeContext.products.length > 0) {
    prompt += `\nPRODUCTS (sample):\n`
    prompt += storeContext.products.slice(0, 15).map(p =>
      `- ${p.title}: Rs.${p.price} ${p.inStock ? "(In Stock)" : "(Out of Stock)"}`
    ).join("\n")
  }

  if (storeContext.policies?.refund) {
    const short = storeContext.policies.refund.substring(0, 300)
    prompt += `\n\nRETURN POLICY:\n${short}`
  }

  if (storeContext.policies?.shipping) {
    const short = storeContext.policies.shipping.substring(0, 200)
    prompt += `\n\nSHIPPING POLICY:\n${short}`
  }

  if (storeContext.returnPolicySummary) {
    prompt += `\n\nRETURN RULES:\n${storeContext.returnPolicySummary}`
  }

  return prompt
}
