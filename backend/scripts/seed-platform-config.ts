import { getDb, initDatabase } from "../config/database"
import { platformConfig } from "../models/schema"

const defaultConfigs = [
  // Platform
  { key: "platform_name", value: "Quilo", category: "platform", label: "Platform Name", type: "text", description: "Name displayed in the UI" },
  { key: "platform_tagline", value: "AI-Powered Merchant Automation", category: "platform", label: "Tagline", type: "text", description: "Short description of the platform" },
  { key: "maintenance_mode", value: "false", category: "platform", label: "Maintenance Mode", type: "boolean", description: "Show maintenance page to merchants" },

  // Security
  { key: "jwt_expires_in", value: "7d", category: "security", label: "JWT Expiry", type: "text", description: "How long merchant sessions last" },
  { key: "superadmin_jwt_expires_in", value: "12h", category: "security", label: "Superadmin JWT Expiry", type: "text", description: "How long superadmin sessions last" },
  { key: "max_login_attempts", value: "5", category: "security", label: "Max Login Attempts", type: "number", description: "Before account lockout" },
  { key: "lockout_duration_minutes", value: "15", category: "security", label: "Lockout Duration (min)", type: "number", description: "Minutes to lock account" },

  // SMTP
  { key: "smtp_host", value: "smtp.gmail.com", category: "smtp", label: "SMTP Host", type: "text", description: "Email server hostname" },
  { key: "smtp_port", value: "587", category: "smtp", label: "SMTP Port", type: "number", description: "Email server port" },
  { key: "smtp_user", value: "", category: "smtp", label: "SMTP Username", type: "text", description: "Email authentication username" },
  { key: "smtp_pass", value: "", category: "smtp", label: "SMTP Password", type: "password", description: "Email authentication password" },
  { key: "smtp_from", value: "", category: "smtp", label: "From Address", type: "text", description: "Default sender email address" },

  // API Keys
  { key: "shopify_client_id", value: "", category: "api_keys", label: "Shopify Client ID", type: "password", description: "Shopify OAuth client ID" },
  { key: "shopify_client_secret", value: "", category: "api_keys", label: "Shopify Client Secret", type: "password", description: "Shopify OAuth client secret" },
  { key: "lemon_squeezy_api_key", value: "", category: "api_keys", label: "LemonSqueezy API Key", type: "password", description: "Payment processor API key" },
  { key: "google_ai_api_key", value: "", category: "api_keys", label: "Google AI API Key", type: "password", description: "AI features API key" },

  // Plans
  { key: "plan_free_name", value: "Free", category: "plans", label: "Free Plan Name", type: "text", description: "Display name for free tier" },
  { key: "plan_starter_price", value: "29", category: "plans", label: "Starter Plan Price", type: "number", description: "Monthly price in USD" },
  { key: "plan_pro_price", value: "79", category: "plans", label: "Pro Plan Price", type: "number", description: "Monthly price in USD" },
  { key: "plan_enterprise_price", value: "199", category: "plans", label: "Enterprise Plan Price", type: "number", description: "Monthly price in USD" },
]

async function seed() {
  await initDatabase()
  const db = getDb()

  for (const config of defaultConfigs) {
    await db.insert(platformConfig).values(config).onConflictDoNothing()
  }

  console.log(`Seeded ${defaultConfigs.length} config values`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Failed to seed:", err)
  process.exit(1)
})
