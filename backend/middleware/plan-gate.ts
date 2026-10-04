import { Response, NextFunction } from "express"
import { AuthRequest } from "./auth"
import { getUserPlan, getTeamSeatUsage } from "../services/billing"

// Middleware: requires an active paid subscription
export async function requirePaidPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plan = await getUserPlan(req.userId!)

    if (!plan.isPaid || plan.status !== "active") {
      return res.status(403).json({
        error: "This feature requires a paid plan",
        code: "UPGRADE_REQUIRED",
        currentPlan: plan.plan,
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify subscription" })
  }
}

// Middleware: requires available team seats (paid plan + under limit)
export async function requireTeamSeat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const usage = await getTeamSeatUsage(req.userId!)

    if (usage.limit <= 1) {
      return res.status(403).json({
        error: "Team members require a paid plan. Please upgrade to add team members.",
        code: "UPGRADE_REQUIRED",
        currentPlan: usage.plan,
        seats: { used: usage.used, limit: usage.limit },
      })
    }

    if (usage.used >= usage.limit) {
      return res.status(403).json({
        error: `Seat limit reached (${usage.used}/${usage.limit}). Please upgrade your plan to add more members.`,
        code: "SEAT_LIMIT_REACHED",
        currentPlan: usage.plan,
        seats: { used: usage.used, limit: usage.limit },
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify team seats" })
  }
}
