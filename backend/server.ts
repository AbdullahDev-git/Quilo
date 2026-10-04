import express from "express"
import cors from "cors"
import helmet from "helmet"
import pinoHttp from "pino-http"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import { config } from "./config"
import { logger } from "./config/logger"
import { initDatabase, testConnection } from "./config/database"
import { authenticate } from "./middleware/auth"
import authRoutes from "./routes/auth"
import rulesRoutes from "./routes/rules"
import storesRoutes from "./routes/stores"
import { handleShopifyWebhook, syncOrders } from "./controllers/shopify"
import { handleLemonSqueezyWebhook } from "./controllers/lemon-squeezy"
import { startWorkers, stopWorkers, getQueueHealth } from "./jobs/queue"
import ordersRoutes from "./routes/orders"
import analyticsRoutes from "./routes/analytics"
import approvalsRoutes from "./routes/approvals"
import customersRoutes from "./routes/customers"
import chatRoutes from "./routes/chat"
import webhooksMgmtRoutes from "./routes/webhooks_mgmt"
import dashboardRoutes from "./routes/dashboard"
import activityRoutes from "./routes/activity"
import usersRoutes from "./routes/users"
import integrationsRoutes from "./routes/integrations"
import spendCapsRoutes from "./routes/spend-caps"
import teamMembersRoutes from "./routes/team-members"
import aiRoutes from "./routes/ai"
import woocommerceRoutes from "./routes/woocommerce"
import lemonSqueezyRoutes from "./routes/lemon-squeezy"
import superadminAuthRoutes from "./routes/superadmin/auth"
import superadminDashboardRoutes from "./routes/superadmin/dashboard"
import superadminUsersRoutes from "./routes/superadmin/users"
import superadminStoresRoutes from "./routes/superadmin/stores"
import superadminAuditRoutes from "./routes/superadmin/audit"
import superadminRulesRoutes from "./routes/superadmin/rules"
import superadminBillingRoutes from "./routes/superadmin/billing"
import superadminAnalyticsRoutes from "./routes/superadmin/analytics"
import superadminSupportRoutes from "./routes/superadmin/support"
import superadminConfigRoutes from "./routes/superadmin/config"
import shopifyAuthRoutes from "./routes/auth/shopify"
import woocommerceAuthRoutes from "./routes/auth/woocommerce"
import portalRoutes from "./routes/portal"

const app = express()

app.use(helmet())
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}))
app.use(pinoHttp({ logger }))
app.use(cookieParser())

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

// Lemon Squeezy needs raw body for signature verification
app.use("/api/webhooks/lemon-squeezy", express.raw({ type: "application/json" }))
app.use(express.json({ limit: "2mb" }))

// Routes
app.use("/api/auth", authLimiter, authRoutes)
app.use("/api/rules", apiLimiter, rulesRoutes)
app.use("/api/stores", apiLimiter, storesRoutes)
app.use("/api/orders", apiLimiter, ordersRoutes)
app.use("/api/analytics", apiLimiter, analyticsRoutes)
app.use("/api/approvals", apiLimiter, approvalsRoutes)
app.use("/api/customers", apiLimiter, customersRoutes)
app.use("/api/chat", apiLimiter, chatRoutes)
app.use("/api/portal", apiLimiter, portalRoutes)
app.use("/api/webhooks", apiLimiter, webhooksMgmtRoutes)
app.use("/api/dashboard", apiLimiter, dashboardRoutes)
app.use("/api/activity", apiLimiter, activityRoutes)
app.use("/api/users", apiLimiter, usersRoutes)
app.use("/api/integrations", apiLimiter, integrationsRoutes)
app.use("/api/spend-caps", apiLimiter, spendCapsRoutes)
app.use("/api/team-members", apiLimiter, teamMembersRoutes)
app.use("/api/ai", apiLimiter, aiRoutes)
app.use("/api/woocommerce", apiLimiter, woocommerceRoutes)
app.use("/api/billing", apiLimiter, lemonSqueezyRoutes)

// Superadmin routes - separate auth system with stricter rate limiting
const superadminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter than regular auth
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api/superadmin/auth", superadminAuthLimiter, superadminAuthRoutes)
app.use("/api/superadmin/dashboard", apiLimiter, superadminDashboardRoutes)
app.use("/api/superadmin/users", apiLimiter, superadminUsersRoutes)
app.use("/api/superadmin/stores", apiLimiter, superadminStoresRoutes)
app.use("/api/superadmin/audit", apiLimiter, superadminAuditRoutes)
app.use("/api/superadmin/rules", apiLimiter, superadminRulesRoutes)
app.use("/api/superadmin/billing", apiLimiter, superadminBillingRoutes)
app.use("/api/superadmin/analytics", apiLimiter, superadminAnalyticsRoutes)
app.use("/api/superadmin/support", apiLimiter, superadminSupportRoutes)
app.use("/api/superadmin/config", apiLimiter, superadminConfigRoutes)

// Shopify OAuth routes
app.use("/api/auth/shopify", shopifyAuthRoutes)

// WooCommerce OAuth callback (public — WC-Auth server-to-server)
app.use("/api/auth/woocommerce", woocommerceAuthRoutes)

// Webhook handlers (external, no auth needed)
app.post("/api/webhooks/shopify", handleShopifyWebhook)
app.post("/api/webhooks/lemon-squeezy", handleLemonSqueezyWebhook)

// Shopify sync (requires auth)
app.post("/api/stores/:storeId/sync", authenticate, syncOrders)

// Health check
app.get("/api/health", async (_req, res) => {
  const queueHealth = await getQueueHealth()
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    redis: queueHealth.redis,
    queues: queueHealth.queues,
  })
})

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error")
  const status = err.statusCode || err.status || 500
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  })
})

async function start() {
  await initDatabase()
  const dbConnected = await testConnection()

  if (!dbConnected) {
    logger.warn("Starting without database connection. Some features will be unavailable.")
  }

  // Warn if SMTP is not configured
  const { isEmailConfigured } = await import("./services/email")
  if (!isEmailConfigured()) {
    logger.warn("SMTP not configured — email notifications will be skipped. Set SMTP_USER and SMTP_PASS in .env.")
  }

  await startWorkers()

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv, db: dbConnected }, "Quilo API server started")
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received, closing workers...")
    await stopWorkers()
    process.exit(0)
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((err) => logger.fatal({ err }, "Failed to start server"))

export default app
