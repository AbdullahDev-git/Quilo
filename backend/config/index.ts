import dotenv from "dotenv"
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "",
  cookieDomain: process.env.COOKIE_DOMAIN || "",

  database: {
    url: process.env.DATABASE_URL || "./quilo.db",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID || "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
    appUrl: process.env.SHOPIFY_APP_URL || "",
    apiVersion: "2024-10",
  },

  lemonSqueezy: {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY || "",
    storeId: process.env.LEMON_SQUEEZY_STORE_ID || "",
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "",
  },

  sentry: {
    dsn: process.env.SENTRY_DSN || "",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  googleAI: {
    apiKey: process.env.GOOGLE_AI_API_KEY || "",
  },

  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Superadmin auth - completely separate from merchant auth
  superadmin: {
    jwtSecret: process.env.SUPERADMIN_JWT_SECRET || "superadmin-change-me-in-production",
    jwtExpiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN || "12h",
    totpIssuer: process.env.SUPERADMIN_TOTP_ISSUER || "Quilo Superadmin",
    maxLoginAttempts: parseInt(process.env.SUPERADMIN_MAX_LOGIN_ATTEMPTS || "5", 10),
    lockoutDurationMinutes: parseInt(process.env.SUPERADMIN_LOCKOUT_MINUTES || "15", 10),
    alertEmail: process.env.SUPERADMIN_ALERT_EMAIL || "",
  },
}
