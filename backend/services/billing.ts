import { getDb } from "../config/database"
import { subscriptions, teamMembers } from "../models/schema"
import { eq, and, ne } from "drizzle-orm"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "billing" })

export interface UserPlan {
  plan: string
  status: string
  isPaid: boolean
  currentPeriodEnd?: string | null
}

// Seat limits per plan
const SEAT_LIMITS: Record<string, number> = {
  free: 1,
  starter: 3,
  pro: 5,
  enterprise: 999,
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    const [sub] = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (!sub || sub.status !== "active") {
      return { plan: "free", status: "inactive", isPaid: false }
    }

    return {
      plan: sub.plan,
      status: sub.status,
      isPaid: sub.plan !== "free",
      currentPeriodEnd: sub.currentPeriodEnd,
    }
  } catch (error) {
    log.warn({ err: error, userId }, "Failed to fetch user plan, defaulting to free")
    return { plan: "free", status: "inactive", isPaid: false }
  }
}

export function getTeamSeatLimit(plan: string): number {
  return SEAT_LIMITS[plan] || SEAT_LIMITS.free
}

export async function getTeamSeatUsage(userId: string): Promise<{ used: number; limit: number; plan: string }> {
  const planInfo = await getUserPlan(userId)
  const limit = getTeamSeatLimit(planInfo.plan)

  // Count owner + active/pending members (excluding the owner themselves)
  const members = await getDb()
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))

  const used = 1 + members.length // 1 = owner seat

  return { used, limit, plan: planInfo.plan }
}
