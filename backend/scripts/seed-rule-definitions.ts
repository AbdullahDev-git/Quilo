import { getDb, initDatabase } from "../config/database"
import { ruleDefinitions } from "../models/schema"

const defaultRules = [
  { name: "auto_refund", displayName: "Auto Refund", description: "Automatically refund orders based on conditions", category: "Refunds", requiredPlan: "free" },
  { name: "email_notification", displayName: "Email Notification", description: "Send email notifications on events", category: "Notifications", requiredPlan: "free" },
  { name: "order_tagging", displayName: "Order Tagging", description: "Auto-tag orders based on conditions", category: "Organization", requiredPlan: "free" },
  { name: "webhook", displayName: "Webhook", description: "Send data to external URLs", category: "Integrations", requiredPlan: "starter" },
  { name: "slack_notification", displayName: "Slack Notification", description: "Send alerts to Slack channels", category: "Notifications", requiredPlan: "starter" },
  { name: "conditional_logic", displayName: "Conditional Logic", description: "Advanced if/then/else conditions", category: "Logic", requiredPlan: "starter" },
  { name: "ai_refund_analysis", displayName: "AI Refund Analysis", description: "Use AI to analyze refund patterns", category: "AI", requiredPlan: "pro" },
  { name: "ai_rule_suggestion", displayName: "AI Rule Suggestions", description: "AI-powered rule recommendations", category: "AI", requiredPlan: "pro" },
  { name: "custom_conditions", displayName: "Custom Conditions", description: "Build complex custom condition sets", category: "Logic", requiredPlan: "pro" },
  { name: "batch_operations", displayName: "Batch Operations", description: "Process multiple orders at once", category: "Operations", requiredPlan: "pro" },
  { name: "api_access", displayName: "API Access", description: "Full API access for custom integrations", category: "Integrations", requiredPlan: "enterprise" },
  { name: "custom_webhooks", displayName: "Custom Webhooks", description: "Advanced webhook configurations", category: "Integrations", requiredPlan: "enterprise" },
]

async function seed() {
  await initDatabase()
  const db = getDb()

  for (const rule of defaultRules) {
    await db.insert(ruleDefinitions).values(rule).onConflictDoNothing()
  }

  console.log(`Seeded ${defaultRules.length} rule definitions`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Failed to seed:", err)
  process.exit(1)
})
