import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { config } from "../config"

export interface SuperadminAuthRequest extends Request {
  adminId?: string
}

export interface SuperadminJwtPayload {
  adminId: string
  sessionId: string
}

/**
 * Middleware to authenticate superadmin requests.
 * Uses a completely separate JWT secret from merchant auth.
 */
export function authenticateSuperadmin(req: SuperadminAuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.superadmin_session || req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({ error: "Authentication required", code: "SUPERADMIN_AUTH_REQUIRED" })
  }

  try {
    const decoded = jwt.verify(token, config.superadmin.jwtSecret) as SuperadminJwtPayload
    req.adminId = decoded.adminId
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired session", code: "SUPERADMIN_SESSION_EXPIRED" })
  }
}

/**
 * Generate a superadmin JWT token.
 */
export function generateSuperadminToken(adminId: string, sessionId: string): string {
  const secret = config.superadmin.jwtSecret || "fallback-secret-change-me"
  const expiresIn = config.superadmin.jwtExpiresIn || "12h"
  return jwt.sign({ adminId, sessionId }, secret, { expiresIn })
}

/**
 * Verify a superadmin JWT token without middleware.
 */
export function verifySuperadminToken(token: string): SuperadminJwtPayload | null {
  try {
    return jwt.verify(token, config.superadmin.jwtSecret) as SuperadminJwtPayload
  } catch {
    return null
  }
}
