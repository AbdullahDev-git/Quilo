import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import { OAuth2Client } from "google-auth-library"
import { getDb } from "../config/database"
import { users } from "../models/schema"
import { authenticate, generateToken, AuthRequest } from "../middleware/auth"
import { config } from "../config"
import { getSessionCookieOptions } from "../config/cookies"
import { sendEmail } from "../services/email"
import { eq, and, gt } from "drizzle-orm"
import { validate, registerSchema, loginSchema, googleAuthSchema } from "../middleware/validate"
import { generateCsrfToken } from "../middleware/csrf"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "auth" })
const router = Router()

// Security constants
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

// Check if account is locked
function isLocked(user: { lockedUntil: string | null }): boolean {
  if (!user.lockedUntil) return false
  return new Date(user.lockedUntil) > new Date()
}

// Increment login attempts
async function incrementLoginAttempts(userId: string, currentAttempts: number) {
  if (currentAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
    await getDb()
      .update(users)
      .set({ loginAttempts: currentAttempts + 1, lockedUntil })
      .where(eq(users.id, userId))
  } else {
    await getDb()
      .update(users)
      .set({ loginAttempts: currentAttempts + 1 })
      .where(eq(users.id, userId))
  }
}

// Reset login attempts
async function resetLoginAttempts(userId: string) {
  await getDb()
    .update(users)
    .set({ loginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId))
}

// Send security alert for new device/IP
async function sendLoginAlert(
  email: string,
  name: string,
  ipAddress: string,
  userAgent: string,
  isNewDevice: boolean
) {
  const subject = isNewDevice
    ? "[Quilo Security] New device login"
    : "[Quilo Security] New IP login"

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Quilo</h1>
        <p style="color: #94a3b8; margin: 5px 0 0;">Security Alert</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #1e293b;">New Login Detected</h2>
        <p>A login to your account was detected from a ${isNewDevice ? "new device" : "new IP address"}:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Account</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: bold;">${name} (${email})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">IP Address</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #64748b;">Device</td>
            <td style="padding: 8px; color: #1e293b; font-size: 12px;">${userAgent || "Unknown"}</td>
          </tr>
        </table>
        <p style="color: #ef4444; font-weight: bold;">If this wasn't you, change your password immediately.</p>
      </div>
      <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        This is an automated security alert from Quilo.
      </div>
    </div>
  `

  await sendEmail({ to: email, subject, html })
}

router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body

    const existing = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = crypto.randomUUID()
    await getDb().insert(users).values({ id: userId, email, name, passwordHash })
    const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1)

    const token = generateToken(user.id)

    res.cookie("session", token, getSessionCookieOptions())

    log.info({ userId: user.id, email }, "User registered")
    return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    log.error({ err: error, message: (error as Error).message, stack: (error as Error).stack }, "Registration failed")
    return res.status(500).json({ error: "Registration failed", detail: (error as Error).message })
  }
})

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const ipAddress = req.ip || req.socket?.remoteAddress || "unknown"
    const userAgent = req.headers["user-agent"] || ""

    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) {
      log.warn({ email }, "Login attempt with unknown email")
      // Still run bcrypt.compare to prevent timing attacks
      await bcrypt.compare(password, "$2a$12$invalidhashtopreventtimingattacks")
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check if account is locked
    if (isLocked(user)) {
      log.warn({ userId: user.id }, "Login attempt on locked account")
      return res.status(423).json({
        error: "Account locked due to too many failed attempts",
        lockedUntil: user.lockedUntil,
      })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      // Increment login attempts
      await incrementLoginAttempts(user.id, user.loginAttempts)
      log.warn({ userId: user.id }, "Login attempt with wrong password")

      // Check if this attempt triggered a lockout
      const updatedAttempts = user.loginAttempts + 1
      if (updatedAttempts >= MAX_LOGIN_ATTEMPTS) {
        log.warn({ userId: user.id }, "Account locked after max login attempts")
      }

      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check for new device/IP before resetting attempts
    const isNewDevice = !user.lastLoginUserAgent || user.lastLoginUserAgent !== userAgent
    const isNewIp = !user.lastLoginIp || user.lastLoginIp !== ipAddress

    // Reset login attempts on success
    await resetLoginAttempts(user.id)

    // Update last login info
    await getDb()
      .update(users)
      .set({
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: ipAddress,
        lastLoginUserAgent: userAgent,
      })
      .where(eq(users.id, user.id))

    const token = generateToken(user.id)

    res.cookie("session", token, getSessionCookieOptions())

    // Send alert for new device/IP
    if (isNewDevice || isNewIp) {
      sendLoginAlert(user.email, user.name, ipAddress, userAgent, isNewDevice).catch((err) => {
        log.error({ err }, "Failed to send login alert")
      })
    }

    log.info({ userId: user.id, isNewDevice, isNewIp }, "User logged in")
    return res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    log.error({ err: error }, "Login failed")
    return res.status(500).json({ error: "Login failed" })
  }
})

router.post("/google", validate(googleAuthSchema), async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body

    const client = new OAuth2Client(config.google.clientId)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token" })
    }

    const googleId = payload.sub
    const email = payload.email
    const name = payload.name || email.split("@")[0]

    let [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      const newId = crypto.randomUUID()
      await getDb()
        .insert(users)
        .values({ id: newId, email, name, passwordHash: `google_${googleId}` })
      ;[user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
    }

    const token = generateToken(user.id)

    res.cookie("session", token, getSessionCookieOptions())

    log.info({ userId: user.id }, "Google auth success")
    return res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    log.error({ err: error }, "Google auth failed")
    return res.status(401).json({ error: "Google authentication failed" })
  }
})

router.get("/google", (req: Request, res: Response) => {
  const clientId = config.google.clientId
  if (!clientId) {
    return res.status(400).json({ error: "Google OAuth not configured" })
  }

  const backendUrl = config.appUrl || `http://localhost:${config.port}`
  const redirectUri = `${backendUrl}/api/auth/google/callback`
  const state = crypto.randomUUID()

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "openid email profile")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")

  res.redirect(authUrl.toString())
})

router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing authorization code" })
    }

    const clientId = config.google.clientId
    const clientSecret = config.google.clientSecret
    const backendUrl = config.appUrl || `http://localhost:${config.port}`
    const redirectUri = `${backendUrl}/api/auth/google/callback`

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.id_token) {
      return res.status(401).json({ error: "Failed to get ID token" })
    }

    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({
      idToken: tokenData.id_token,
      audience: clientId,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token" })
    }

    const googleId = payload.sub
    const email = payload.email
    const name = payload.name || email.split("@")[0]

    let [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      const cbId = crypto.randomUUID()
      await getDb()
        .insert(users)
        .values({ id: cbId, email, name, passwordHash: `google_${googleId}` })
      ;[user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
    }

    const token = generateToken(user.id)

    res.cookie("session", token, getSessionCookieOptions())
    return res.redirect(`${config.frontendUrl}/dashboard`)
  } catch (error) {
    log.error({ err: error }, "Google callback failed")
    res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`)
  }
})

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("session", { path: "/", domain: config.cookieDomain || undefined })
  return res.json({ success: true })
})

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await getDb().select().from(users).where(eq(users.id, req.userId!)).limit(1)
    if (!user) {
      return res.status(401).json({ user: null })
    }
    return res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch {
    return res.status(401).json({ user: null })
  }
})

router.get("/csrf-token", (req: Request, res: Response) => {
  const sessionId = req.cookies?.session || ""
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" })
  }
  const token = generateCsrfToken(sessionId)
  return res.json({ csrfToken: token })
})

export default router
