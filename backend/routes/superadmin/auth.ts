import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { TOTP, generateSecret, generateURI, verify as verifyTotp } from "otplib"
import { getDb } from "../../config/database"
import { admins, adminSessions, adminAuditLogs } from "../../models/schema"
import { generateSuperadminToken, verifySuperadminToken } from "../../middleware/superadmin-auth"
import { config } from "../../config"
import { getSessionCookieOptions } from "../../config/cookies"
import { sendEmail } from "../../services/email"
import { eq, and, gt } from "drizzle-orm"

const router = Router()

// Cookie options for superadmin session
function getSuperadminCookieOptions() {
  const isProd = config.nodeEnv === "production"
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    domain: config.cookieDomain || undefined,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: "/",
  }
}

// Check if admin account is locked
function isLocked(admin: { lockedUntil: string | null }): boolean {
  if (!admin.lockedUntil) return false
  return new Date(admin.lockedUntil) > new Date()
}

// Increment login attempts
async function incrementLoginAttempts(adminId: string, currentAttempts: number) {
  const maxAttempts = config.superadmin.maxLoginAttempts
  const lockoutMinutes = config.superadmin.lockoutDurationMinutes

  if (currentAttempts + 1 >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
    await getDb()
      .update(admins)
      .set({ loginAttempts: currentAttempts + 1, lockedUntil })
      .where(eq(admins.id, adminId))
  } else {
    await getDb()
      .update(admins)
      .set({ loginAttempts: currentAttempts + 1 })
      .where(eq(admins.id, adminId))
  }
}

// Reset login attempts on success
async function resetLoginAttempts(adminId: string) {
  await getDb()
    .update(admins)
    .set({ loginAttempts: 0, lockedUntil: null })
    .where(eq(admins.id, adminId))
}

// Send security alert email for new device/IP
async function sendSecurityAlert(
  adminEmail: string,
  adminName: string,
  ipAddress: string,
  userAgent: string,
  isNewDevice: boolean
) {
  if (!config.superadmin.alertEmail) return

  const subject = isNewDevice
    ? "[Quilo Security] New device login to Superadmin Console"
    : "[Quilo Security] New IP login to Superadmin Console"

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f172a; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Quilo Superadmin</h1>
        <p style="color: #94a3b8; margin: 5px 0 0;">Security Alert</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #1e293b;">New Login Detected</h2>
        <p>A login to the Superadmin Console was detected from a ${isNewDevice ? "new device" : "new IP address"}:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Admin</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: bold;">${adminName} (${adminEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">IP Address</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Device</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 12px;">${userAgent || "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #64748b;">Time</td>
            <td style="padding: 8px; color: #1e293b;">${new Date().toISOString()}</td>
          </tr>
        </table>
        <p style="color: #ef4444; font-weight: bold;">If this wasn't you, secure your account immediately.</p>
      </div>
      <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        This is an automated security alert from Quilo.
      </div>
    </div>
  `

  await sendEmail({
    to: config.superadmin.alertEmail,
    subject,
    html,
  })
}

// Log admin audit event
async function logAuditEvent(
  adminId: string,
  event: string,
  description: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
) {
  await getDb().insert(adminAuditLogs).values({
    adminId,
    event,
    description,
    ipAddress,
    userAgent,
    metadata,
  })
}

/**
 * POST /api/superadmin/auth/login
 * Step 1: Verify email + password, then check if 2FA is required.
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" })
    }

    const [admin] = await getDb().select().from(admins).where(eq(admins.email, email)).limit(1)

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    if (isLocked(admin)) {
      return res.status(423).json({
        error: "Account locked due to too many failed attempts",
        lockedUntil: admin.lockedUntil,
      })
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      await incrementLoginAttempts(admin.id, admin.loginAttempts)
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Password valid - check if 2FA is enabled
    if (admin.totpEnabled === "true") {
      // Generate a temporary token for 2FA verification (expires in 5 minutes)
      const tempToken = jwt.sign(
        { adminId: admin.id, step: "totp_pending" },
        config.superadmin.jwtSecret,
        { expiresIn: "5m" }
      )

      await logAuditEvent(
        admin.id,
        "LOGIN_STEP1_SUCCESS",
        "Password verified, awaiting 2FA",
        req.ip,
        req.headers["user-agent"]
      )

      return res.json({
        requires2fa: true,
        tempToken,
        message: "Password verified. Please enter your 2FA code.",
      })
    }

    // No 2FA - complete login
    const sessionId = crypto.randomUUID()
    const token = generateSuperadminToken(admin.id, sessionId)

    // Store session
    await getDb().insert(adminSessions).values({
      adminId: admin.id,
      token,
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "",
      deviceFingerprint: req.body.deviceFingerprint || "",
      isTrusted: "false",
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    })

    // Update last login
    await getDb()
      .update(admins)
      .set({
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers["user-agent"],
      })
      .where(eq(admins.id, admin.id))

    await resetLoginAttempts(admin.id)

    // Check if new device/IP and send alert
    const isNewDevice = !admin.lastLoginUserAgent || admin.lastLoginUserAgent !== req.headers["user-agent"]
    const isNewIp = !admin.lastLoginIp || admin.lastLoginIp !== req.ip

    if (isNewDevice || isNewIp) {
      await sendSecurityAlert(
        admin.email,
        admin.name,
        req.ip || "unknown",
        req.headers["user-agent"] || "",
        isNewDevice
      )
    }

    await logAuditEvent(
      admin.id,
      "LOGIN_SUCCESS",
      "Superadmin logged in",
      req.ip,
      req.headers["user-agent"]
    )

    res.cookie("superadmin_session", token, getSuperadminCookieOptions())
    return res.json({
      admin: { id: admin.id, email: admin.email, name: admin.name },
      requires2fa: false,
    })
  } catch (error) {
    console.error("Superadmin login failed:", error)
    return res.status(500).json({ error: "Login failed" })
  }
})

/**
 * POST /api/superadmin/auth/verify-2fa
 * Step 2: Verify TOTP code after password verification.
 */
router.post("/verify-2fa", async (req: Request, res: Response) => {
  try {
    const { tempToken, totpCode } = req.body

    if (!tempToken || !totpCode) {
      return res.status(400).json({ error: "Temporary token and 2FA code required" })
    }

    // Verify temporary token
    let decoded: { adminId: string; step: string }
    try {
      decoded = jwt.verify(tempToken, config.superadmin.jwtSecret) as { adminId: string; step: string }
    } catch {
      return res.status(401).json({ error: "Session expired. Please login again." })
    }

    if (decoded.step !== "totp_pending") {
      return res.status(401).json({ error: "Invalid session state" })
    }

    const [admin] = await getDb().select().from(admins).where(eq(admins.id, decoded.adminId)).limit(1)
    if (!admin) {
      return res.status(401).json({ error: "Admin not found" })
    }

    if (isLocked(admin)) {
      return res.status(423).json({
        error: "Account locked due to too many failed attempts",
        lockedUntil: admin.lockedUntil,
      })
    }

    // Verify TOTP code
    const totpSecret = admin.totpSecret
    if (!totpSecret) {
      return res.status(500).json({ error: "2FA not configured" })
    }

    const isValid = await verifyTotp({
      token: totpCode,
      secret: totpSecret,
    })

    if (!isValid) {
      await incrementLoginAttempts(admin.id, admin.loginAttempts)

      await logAuditEvent(
        admin.id,
        "LOGIN_2FA_FAILED",
        "Invalid 2FA code",
        req.ip,
        req.headers["user-agent"]
      )

      return res.status(401).json({ error: "Invalid 2FA code" })
    }

    // 2FA valid - complete login
    const sessionId = crypto.randomUUID()
    const token = generateSuperadminToken(admin.id, sessionId)

    await getDb().insert(adminSessions).values({
      adminId: admin.id,
      token,
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "",
      deviceFingerprint: req.body.deviceFingerprint || "",
      isTrusted: "false",
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    })

    await getDb()
      .update(admins)
      .set({
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers["user-agent"],
      })
      .where(eq(admins.id, admin.id))

    await resetLoginAttempts(admin.id)

    // Send alert for new device
    const isNewDevice = !admin.lastLoginUserAgent || admin.lastLoginUserAgent !== req.headers["user-agent"]
    if (isNewDevice) {
      await sendSecurityAlert(
        admin.email,
        admin.name,
        req.ip || "unknown",
        req.headers["user-agent"] || "",
        true
      )
    }

    await logAuditEvent(
      admin.id,
      "LOGIN_SUCCESS",
      "Superadmin logged in (2FA verified)",
      req.ip,
      req.headers["user-agent"]
    )

    res.cookie("superadmin_session", token, getSuperadminCookieOptions())
    return res.json({
      admin: { id: admin.id, email: admin.email, name: admin.name },
      requires2fa: false,
    })
  } catch (error) {
    console.error("Superadmin 2FA verification failed:", error)
    return res.status(500).json({ error: "Verification failed" })
  }
})

/**
 * POST /api/superadmin/auth/setup-2fa
 * Generate TOTP secret and QR code for 2FA setup.
 */
router.post("/setup-2fa", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.body

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID required" })
    }

    const [admin] = await getDb().select().from(admins).where(eq(admins.id, adminId)).limit(1)
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" })
    }

    // Generate TOTP secret
    const secret = generateSecret()
    const otpauthUrl = generateURI({
      issuer: config.superadmin.totpIssuer,
      label: admin.email,
      secret,
    })

    // Store the secret (not enabled yet - needs verification)
    await getDb()
      .update(admins)
      .set({ totpSecret: secret })
      .where(eq(admins.id, adminId))

    // Generate QR code as SVG
    const QRCode = await import("qrcode")
    const qrCodeSvg = await QRCode.default.toString(otpauthUrl, { type: "svg" })

    return res.json({
      secret,
      otpauthUrl,
      qrCode: qrCodeSvg,
    })
  } catch (error) {
    console.error("2FA setup failed:", error)
    return res.status(500).json({ error: "Failed to setup 2FA" })
  }
})

/**
 * POST /api/superadmin/auth/confirm-2fa
 * Confirm 2FA setup by verifying first TOTP code.
 */
router.post("/confirm-2fa", async (req: Request, res: Response) => {
  try {
    const { adminId, totpCode } = req.body

    if (!adminId || !totpCode) {
      return res.status(400).json({ error: "Admin ID and 2FA code required" })
    }

    const [admin] = await getDb().select().from(admins).where(eq(admins.id, adminId)).limit(1)
    if (!admin || !admin.totpSecret) {
      return res.status(404).json({ error: "Admin not found or 2FA not initiated" })
    }

    const isValid = await verifyTotp({
      token: totpCode,
      secret: admin.totpSecret,
    })

    if (!isValid) {
      return res.status(401).json({ error: "Invalid 2FA code. Please try again." })
    }

    // Enable 2FA
    await getDb()
      .update(admins)
      .set({ totpEnabled: "true" })
      .where(eq(admins.id, adminId))

    await logAuditEvent(adminId, "2FA_ENABLED", "2FA was enabled", req.ip, req.headers["user-agent"])

    return res.json({ success: true, message: "2FA enabled successfully" })
  } catch (error) {
    console.error("2FA confirmation failed:", error)
    return res.status(500).json({ error: "Failed to confirm 2FA" })
  }
})

/**
 * POST /api/superadmin/auth/logout
 */
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.superadmin_session
    if (token) {
      const decoded = verifySuperadminToken(token)
      if (decoded) {
        // Delete session from DB
        await getDb()
          .delete(adminSessions)
          .where(eq(adminSessions.token, token))

        await logAuditEvent(decoded.adminId, "LOGOUT", "Superadmin logged out", req.ip, req.headers["user-agent"])
      }
    }

    res.clearCookie("superadmin_session", { path: "/", domain: config.cookieDomain || undefined })
    return res.json({ success: true })
  } catch (error) {
    console.error("Superadmin logout failed:", error)
    return res.status(500).json({ error: "Logout failed" })
  }
})

/**
 * GET /api/superadmin/auth/me
 * Get current authenticated superadmin.
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.superadmin_session || req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ admin: null, error: "Not authenticated" })
    }

    const decoded = verifySuperadminToken(token)
    if (!decoded) {
      return res.status(401).json({ admin: null, error: "Invalid session" })
    }

    const [admin] = await getDb().select().from(admins).where(eq(admins.id, decoded.adminId)).limit(1)
    if (!admin) {
      return res.status(401).json({ admin: null, error: "Admin not found" })
    }

    // Verify session still exists
    const [session] = await getDb()
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.adminId, admin.id),
          eq(adminSessions.token, token),
          gt(adminSessions.expiresAt, new Date().toISOString())
        )
      )
      .limit(1)

    if (!session) {
      res.clearCookie("superadmin_session", { path: "/" })
      return res.status(401).json({ admin: null, error: "Session expired" })
    }

    return res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        totpEnabled: admin.totpEnabled === "true",
        lastLoginAt: admin.lastLoginAt,
      },
    })
  } catch (error) {
    console.error("Superadmin auth check failed:", error)
    return res.status(401).json({ admin: null })
  }
})

/**
 * GET /api/superadmin/auth/sessions
 * List active sessions for current admin.
 */
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.superadmin_session || req.headers.authorization?.replace("Bearer ", "")
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const decoded = verifySuperadminToken(token)
    if (!decoded) {
      return res.status(401).json({ error: "Invalid session" })
    }

    const sessions = await getDb()
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.adminId, decoded.adminId),
          gt(adminSessions.expiresAt, new Date().toISOString())
        )
      )

    return res.json({ sessions })
  } catch (error) {
    console.error("Failed to fetch sessions:", error)
    return res.status(500).json({ error: "Failed to fetch sessions" })
  }
})

/**
 * DELETE /api/superadmin/auth/sessions/:id
 * Revoke a specific session.
 */
router.delete("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.superadmin_session
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const decoded = verifySuperadminToken(token)
    if (!decoded) {
      return res.status(401).json({ error: "Invalid session" })
    }

    const { id } = req.params
    await getDb()
      .delete(adminSessions)
      .where(
        and(
          eq(adminSessions.id, id),
          eq(adminSessions.adminId, decoded.adminId)
        )
      )

    return res.json({ success: true })
  } catch (error) {
    console.error("Failed to revoke session:", error)
    return res.status(500).json({ error: "Failed to revoke session" })
  }
})

export default router
