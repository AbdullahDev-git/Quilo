import { config } from "./index"

export function getSessionCookieOptions() {
  const isProd = config.nodeEnv === "production"
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    domain: config.cookieDomain || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  }
}
