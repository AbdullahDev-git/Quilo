import { Router, Response } from "express"
import { getDb } from "../config/database"
import { teamMembers, users } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { validate, inviteTeamMemberSchema, updateTeamMemberSchema } from "../middleware/validate"
import { requireTeamSeat } from "../middleware/plan-gate"
import { buildTeamInviteEmail } from "../services/email"
import { addEmailJob } from "../jobs/queue"
import { config } from "../config"
import { createContextLogger } from "../config/logger"
import crypto from "crypto"

const log = createContextLogger({ module: "team-members" })
const router = Router()

// List team members (authenticated owner)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const members = await getDb()
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
        name: teamMembers.name,
        role: teamMembers.role,
        status: teamMembers.status,
        invitedAt: teamMembers.invitedAt,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, req.userId!))

    return res.json(members)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch team members")
    return res.status(500).json({ error: "Failed to fetch team members" })
  }
})

// Invite a team member (authenticated owner + paid plan + seat check)
router.post("/", authenticate, requireTeamSeat, validate(inviteTeamMemberSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role } = req.body

    // Check duplicate
    const existing = await getDb()
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, req.userId!), eq(teamMembers.email, email)))
      .limit(1)

    if (existing.length > 0) {
      return res.status(409).json({ error: "Team member already invited" })
    }

    // Get inviter name for email
    const [inviter] = await getDb()
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1)

    // Generate invite token (expires in 7 days)
    const inviteToken = crypto.randomBytes(32).toString("hex")
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const memberId = crypto.randomUUID()
    await getDb()
      .insert(teamMembers)
      .values({
        id: memberId,
        userId: req.userId!,
        email,
        name,
        role: role || "member",
        status: "pending",
        inviteToken,
        tokenExpiresAt,
      })

    // Send invite email
    const inviteLink = `${config.frontendUrl}/dashboard/settings?invite=${inviteToken}`
    const emailContent = buildTeamInviteEmail(inviter?.name || "A Quilo user", inviteLink)
    const emailSent = await addEmailJob(email, emailContent.subject, emailContent.html)

    const [member] = await getDb().select().from(teamMembers).where(eq(teamMembers.id, memberId)).limit(1)

    log.info({ memberId: member.id, email, role, userId: req.userId, emailSent }, "Team member invited")
    return res.status(201).json({ ...member, emailSent })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to invite team member")
    return res.status(500).json({ error: "Failed to invite team member" })
  }
})

// Accept an invite (public — token-based, no auth required)
router.post("/accept", async (req: any, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: "Invite token is required" })
    }

    const [member] = await getDb()
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.inviteToken, token))
      .limit(1)

    if (!member) {
      return res.status(404).json({ error: "Invalid or expired invite" })
    }

    if (member.status === "active") {
      return res.status(409).json({ error: "Invite already accepted" })
    }

    if (member.tokenExpiresAt && new Date(member.tokenExpiresAt) < new Date()) {
      return res.status(410).json({ error: "Invite has expired" })
    }

    await getDb()
      .update(teamMembers)
      .set({
        status: "active",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inviteToken: null,
      })
      .where(eq(teamMembers.id, member.id))

    log.info({ memberId: member.id, email: member.email }, "Team invite accepted")
    return res.json({ success: true, email: member.email, role: member.role })
  } catch (error) {
    log.error({ err: error }, "Failed to accept invite")
    return res.status(500).json({ error: "Failed to accept invite" })
  }
})

// Update member role (authenticated owner)
router.put("/:id", authenticate, validate(updateTeamMemberSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    await getDb()
      .update(teamMembers)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, req.userId!)))

    const [member] = await getDb().select().from(teamMembers).where(and(eq(teamMembers.id, id), eq(teamMembers.userId, req.userId!))).limit(1)

    if (!member) {
      return res.status(404).json({ error: "Team member not found" })
    }

    log.info({ memberId: id, role, userId: req.userId }, "Team member role updated")
    return res.json(member)
  } catch (error) {
    log.error({ err: error, memberId: req.params.id }, "Failed to update team member")
    return res.status(500).json({ error: "Failed to update team member" })
  }
})

// Remove member (authenticated owner)
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const [member] = await getDb()
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, req.userId!)))
      .limit(1)

    if (!member) {
      return res.status(404).json({ error: "Team member not found" })
    }

    await getDb()
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, req.userId!)))

    log.info({ memberId: id, userId: req.userId }, "Team member removed")
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, memberId: req.params.id }, "Failed to remove team member")
    return res.status(500).json({ error: "Failed to remove team member" })
  }
})

export default router
