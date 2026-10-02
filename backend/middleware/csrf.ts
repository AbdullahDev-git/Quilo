import { Request, Response, NextFunction } from "express"
import crypto from "crypto"

const csrfTokens = new Map<string, { token: string; expires: number }>()

export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString("hex")
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 60 * 60 * 1000,
  })
  return token
}

export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId)
  if (!stored) return false
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId)
    return false
  }
  return stored.token === token
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next()
  }

  const sessionId = req.cookies?.session || ""
  const token = req.headers["x-csrf-token"] as string

  if (!token || !validateCsrfToken(sessionId, token)) {
    return res.status(403).json({ error: "Invalid CSRF token" })
  }

  next()
}
