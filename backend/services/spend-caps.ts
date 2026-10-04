import { getDb } from "../config/database"
import { spendCaps } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "spend-caps-service" })

export interface SpendCapCheckResult {
  allowed: boolean
  capId?: string
  monthlyLimit?: number
  currentSpent?: number
  remaining?: number
  reason?: string
}

function isCurrentPeriod(periodStart: string): boolean {
  const start = new Date(periodStart)
  const now = new Date()
  return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()
}

/**
 * Central spend cap check — called by ALL refund-issuing code paths
 * (rules engine auto-approval, chatbot, approval queue) before executing a refund.
 */
export async function checkRefundAllowed(
  userId: string,
  storeId: string | undefined | null,
  amount: number
): Promise<SpendCapCheckResult> {
  if (!storeId || !userId || !amount || amount <= 0) {
    return { allowed: true, reason: "No spend cap check required" }
  }

  try {
    const db = getDb()
    const [cap] = await db
      .select()
      .from(spendCaps)
      .where(and(eq(spendCaps.userId, userId), eq(spendCaps.storeId, storeId)))
      .limit(1)

    if (!cap) {
      return { allowed: true, reason: "No spend cap configured for this store" }
    }

    if (!isCurrentPeriod(cap.periodStart)) {
      await db
        .update(spendCaps)
        .set({
          currentSpent: "0",
          periodStart: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(spendCaps.id, cap.id))

      const monthlyLimit = parseFloat(cap.monthlyLimit) || 0
      return {
        allowed: true,
        capId: cap.id,
        monthlyLimit,
        currentSpent: 0,
        remaining: monthlyLimit,
      }
    }

    const monthlyLimit = parseFloat(cap.monthlyLimit) || 0
    const currentSpent = parseFloat(cap.currentSpent) || 0
    const remaining = monthlyLimit - currentSpent

    if (monthlyLimit <= 0) {
      return { allowed: true, capId: cap.id, monthlyLimit, currentSpent, remaining }
    }

    if (amount > remaining) {
      log.info(
        { userId, storeId, amount, monthlyLimit, currentSpent, remaining },
        "Refund blocked by spend cap"
      )
      return {
        allowed: false,
        capId: cap.id,
        monthlyLimit,
        currentSpent,
        remaining,
        reason: `Spend cap exceeded: Rs.${amount} refund would exceed remaining Rs.${remaining.toFixed(2)} of Rs.${monthlyLimit.toFixed(2)} monthly limit`,
      }
    }

    return { allowed: true, capId: cap.id, monthlyLimit, currentSpent, remaining }
  } catch (error) {
    log.error({ err: error, userId, storeId }, "Spend cap check failed, allowing refund")
    return { allowed: true, reason: "Spend cap check failed" }
  }
}

/**
 * Record a completed refund against the merchant's spend cap.
 * Must be called AFTER a refund succeeds on any code path.
 */
export async function recordRefund(
  userId: string,
  storeId: string | undefined | null,
  amount: number
): Promise<void> {
  if (!storeId || !userId || !amount || amount <= 0) return

  try {
    const db = getDb()
    const [cap] = await db
      .select()
      .from(spendCaps)
      .where(and(eq(spendCaps.userId, userId), eq(spendCaps.storeId, storeId)))
      .limit(1)

    if (!cap) return

    if (!isCurrentPeriod(cap.periodStart)) {
      await db
        .update(spendCaps)
        .set({
          currentSpent: amount.toString(),
          periodStart: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(spendCaps.id, cap.id))
      log.info({ userId, storeId, amount }, "Spend cap period reset and refund recorded")
    } else {
      const currentSpent = parseFloat(cap.currentSpent) || 0
      const newSpent = currentSpent + amount
      await db
        .update(spendCaps)
        .set({
          currentSpent: newSpent.toString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(spendCaps.id, cap.id))
      log.info(
        { userId, storeId, amount, currentSpent: newSpent },
        "Refund amount recorded against spend cap"
      )
    }
  } catch (error) {
    log.error(
      { err: error, userId, storeId, amount },
      "Failed to record refund against spend cap"
    )
  }
}
