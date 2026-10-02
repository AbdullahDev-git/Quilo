import { GoogleGenAI } from "@google/genai"
import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "ai" })

let genai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: config.googleAI.apiKey })
  }
  return genai
}

interface GenerateRuleResult {
  name: string
  description: string
  conditions: Array<{
    field: string
    operator: string
    value: any
  }>
  actions: Array<{
    type: string
    config: Record<string, any>
  }>
  logic: "all" | "any"
}

export async function generateRule(prompt: string): Promise<GenerateRuleResult> {
  const client = getClient()

  const systemPrompt = `You are an e-commerce automation rule builder for a Shopify store management platform called Quilo.

Given a natural language description, generate a structured automation rule as JSON.

Available condition fields:
- amount (order total)
- currency
- financialStatus (pending, paid, refunded, partially_refunded, voided)
- fulfillmentStatus (fulfilled, unfulfilled, partial, shipped, delivered, returned)
- customerEmail
- customerName
- customerTier (standard, vip, wholesale)
- itemCount (number of items)
- totalDiscount
- shipping
- billingCountry
- shippingCountry
- tags (comma-separated)
- note
- return_reason
- order_age_days
- in_stock (boolean)
- return_count_30d

Available operators:
- equals, not_equals, greater_than, less_than, contains, not_contains, in, not_in, between, is_set, is_not_set

Available action types:
- Auto-refund (automatic refund)
- Instant refund (immediate refund)
- Offer exchange (offer store credit/discount)
- Flag for manual review (flag order)
- Auto-deny return (deny the return)
- Send email notification (send email)
- Fulfill order (auto-fulfill)
- Create discount (generate discount code)
- Update order tags (add tags)
- Send webhook (POST to URL)

Return ONLY valid JSON with this structure:
{
  "name": "Rule name",
  "description": "What this rule does",
  "conditions": [
    { "field": "field_name", "operator": "operator", "value": "value" }
  ],
  "actions": [
    { "type": "Action type", "config": {} }
  ],
  "logic": "all"
}`

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
    contents: prompt,
  })

  const text = response.text
  if (!text) {
    throw new Error("No response from AI")
  }

  try {
    const rule = JSON.parse(text) as GenerateRuleResult
    return rule
  } catch (e) {
    log.error({ err: e, response: text }, "Failed to parse AI response")
    throw new Error("Invalid AI response format")
  }
}

interface FraudAnalysis {
  riskScore: "low" | "medium" | "high"
  confidence: number
  reasons: string[]
  recommendation: string
}

export async function analyzeOrder(orderData: Record<string, any>): Promise<FraudAnalysis> {
  const client = getClient()

  const systemPrompt = `You are a fraud detection analyst for an e-commerce platform.

Analyze the following order data and assess fraud risk.

Return ONLY valid JSON:
{
  "riskScore": "low" | "medium" | "high",
  "confidence": 0.0 to 1.0,
  "reasons": ["reason1", "reason2"],
  "recommendation": "Brief recommendation"
}

Fraud indicators to consider:
- High order amount
- Mismatched billing/shipping countries
- Multiple orders from same email in short time
- Suspicious notes or tags
- Unusual item quantities
- New customer with high-value order
- Rush shipping on expensive items`

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    contents: JSON.stringify(orderData),
  })

  const text = response.text
  if (!text) {
    throw new Error("No response from AI")
  }

  try {
    const analysis = JSON.parse(text) as FraudAnalysis
    return analysis
  } catch (e) {
    log.error({ err: e, response: text }, "Failed to parse AI response")
    throw new Error("Invalid AI response format")
  }
}

interface RuleSuggestion {
  name: string
  description: string
  reasoning: string
}

export async function suggestRules(storeData: {
  totalOrders: number
  returnRate: number
  averageOrderValue: number
  topReturnReasons: string[]
  existingRules: string[]
}): Promise<RuleSuggestion[]> {
  const client = getClient()

  const systemPrompt = `You are an e-commerce automation consultant for a Shopify store management platform called Quilo.

Based on the store's data, suggest 3-5 automation rules that would be most beneficial.

Return ONLY valid JSON array:
[
  {
    "name": "Rule name",
    "description": "What this rule does",
    "reasoning": "Why this rule would help"
  }
]

Focus on:
- Reducing manual work
- Preventing fraud
- Improving customer experience
- Saving money on returns
- Automating repetitive tasks`

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.5,
    },
    contents: JSON.stringify(storeData),
  })

  const text = response.text
  if (!text) {
    throw new Error("No response from AI")
  }

  try {
    const suggestions = JSON.parse(text) as RuleSuggestion[]
    return Array.isArray(suggestions) ? suggestions : [suggestions]
  } catch (e) {
    log.error({ err: e, response: text }, "Failed to parse AI response")
    throw new Error("Invalid AI response format")
  }
}

export async function editRule(
  currentRule: Record<string, any>,
  editInstruction: string
): Promise<GenerateRuleResult> {
  const client = getClient()

  const systemPrompt = `You are an e-commerce automation rule editor.

Given the current rule and an editing instruction, return the updated rule.

Return ONLY valid JSON with this structure:
{
  "name": "Rule name",
  "description": "What this rule does",
  "conditions": [
    { "field": "field_name", "operator": "operator", "value": "value" }
  ],
  "actions": [
    { "type": "Action type", "config": {} }
  ],
  "logic": "all"
}`

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
    contents: `Current rule:\n${JSON.stringify(currentRule, null, 2)}\n\nEdit instruction: ${editInstruction}`,
  })

  const text = response.text
  if (!text) {
    throw new Error("No response from AI")
  }

  try {
    const rule = JSON.parse(text) as GenerateRuleResult
    return rule
  } catch (e) {
    log.error({ err: e, response: text }, "Failed to parse AI response")
    throw new Error("Invalid AI response format")
  }
}
