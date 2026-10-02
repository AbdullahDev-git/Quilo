import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core"

// Superadmin table - completely isolated from merchant users
export const admins = pgTable("admins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret"), // TOTP 2FA secret (encrypted)
  totpEnabled: text("totp_enabled").default("false").notNull(),
  lastLoginAt: text("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  lastLoginUserAgent: text("last_login_user_agent"),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

// Admin login sessions for tracking devices/IPs
export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminId: text("admin_id").references(() => admins.id).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  isTrusted: text("is_trusted").default("false").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

// Admin audit log for security tracking
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminId: text("admin_id").references(() => admins.id).notNull(),
  event: text("event").notNull(),
  description: text("description").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  lastLoginAt: text("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  lastLoginUserAgent: text("last_login_user_agent"),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const stores = pgTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  platform: text("platform").default("shopify").notNull(),
  accessToken: text("access_token").notNull(),
  shopifyStoreId: text("shopify_store_id"),
  status: text("status").default("active").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const rules = pgTable("rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  storeId: text("store_id").references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(),
  actions: jsonb("actions").notNull(),
  logic: text("logic").default("all").notNull(),
  priority: integer("priority").default(0).notNull(),
  status: text("status").default("active").notNull(),
  requiredPlan: text("required_plan").default("free").notNull(),
  triggerCount: integer("trigger_count").default(0).notNull(),
  lastTriggeredAt: text("last_triggered_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

// Rule type definitions - controls which rule types are available per plan
export const ruleDefinitions = pgTable("rule_definitions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  requiredPlan: text("required_plan").default("free").notNull(),
  enabled: text("enabled").default("true").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

// Action logs - tracks every action executed for duplicate prevention + audit
export const actionLogs = pgTable("action_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  storeId: text("store_id").references(() => stores.id),
  orderId: text("order_id").notNull(),
  ruleId: text("rule_id").references(() => rules.id),
  ruleName: text("rule_name"),
  actionType: text("action_type").notNull(),
  status: text("status").default("pending").notNull(), // pending, success, failed, skipped
  verified: text("verified").default("false").notNull(), // true if Shopify confirmed
  verificationData: jsonb("verification_data"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

// Chat sessions - tracks customer chatbot conversations
export const chatSessions = pgTable("chat_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").references(() => stores.id).notNull(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  status: text("status").default("active").notNull(), // active, closed, escalated
  intent: text("intent"), // current detected intent
  context: jsonb("context"), // conversation context (orderId, step, etc.)
  startedAt: text("started_at").$defaultFn(() => new Date().toISOString()).notNull(),
  lastMessageAt: text("last_message_at").$defaultFn(() => new Date().toISOString()).notNull(),
  endedAt: text("ended_at"),
})

// Chat messages - individual messages in a conversation
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").references(() => chatSessions.id).notNull(),
  role: text("role").notNull(), // "customer" | "bot" | "agent"
  content: text("content").notNull(),
  intent: text("intent"), // detected intent for this message
  entities: jsonb("entities"), // extracted entities (orderId, product, reason, etc.)
  actions: jsonb("actions"), // actions taken (refund, lookup, etc.)
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").references(() => stores.id).notNull(),
  topic: text("topic").notNull(),
  endpoint: text("endpoint").notNull(),
  status: text("status").default("active").notNull(),
  lastDeliveryAt: text("last_delivery_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  storeId: text("store_id").references(() => stores.id),
  event: text("event").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  lemonSqueezyId: text("lemon_squeezy_id"),
  plan: text("plan").default("free").notNull(),
  status: text("status").default("active").notNull(),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  storeId: text("store_id").references(() => stores.id),
  orderId: text("order_id").notNull(),
  orderNumber: text("order_number"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  totalAmount: text("total_amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"),
  financialStatus: text("financial_status"),
  fulfillmentStatus: text("fulfillment_status"),
  lineItems: jsonb("line_items").notNull(),
  returnReason: text("return_reason"),
  returnStatus: text("return_status").default("pending"),
  isFraud: text("is_fraud").default("false").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const integrations = pgTable("integrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").notNull(),
  status: text("status").default("disconnected").notNull(),
  lastSyncAt: text("last_sync_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const spendCaps = pgTable("spend_caps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  storeId: text("store_id").references(() => stores.id).notNull(),
  monthlyLimit: text("monthly_limit").notNull(),
  currentSpent: text("current_spent").default("0").notNull(),
  periodStart: text("period_start").$defaultFn(() => new Date().toISOString()).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("member").notNull(),
  status: text("status").default("pending").notNull(),
  invitedAt: text("invited_at").$defaultFn(() => new Date().toISOString()).notNull(),
  joinedAt: text("joined_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // info, warning, maintenance
  targetPlans: jsonb("target_plans").default(["all"]).notNull(),
  status: text("status").default("draft").notNull(), // draft, published, archived
  publishedAt: text("published_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").default("general").notNull(),
  priority: text("priority").default("normal").notNull(),
  status: text("status").default("open").notNull(),
  adminResponse: text("admin_response"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const featureFlags = pgTable("feature_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  enabled: text("enabled").default("false").notNull(),
  requiredPlan: text("required_plan"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})

export const platformConfig = pgTable("platform_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").notNull(),
  label: text("label").notNull(),
  type: text("type").default("text").notNull(), // text, password, boolean, number
  description: text("description"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
})
