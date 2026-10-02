import { Router, Response } from "express"
import { getDb } from "../config/database"
import { teamMembers } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and } from "drizzle-orm"
import { validate, inviteTeamMemberSchema, updateTeamMemberSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "team-members" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
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

router.post("/", validate(inviteTeamMemberSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role } = req.body

    const existing = await getDb()
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, req.userId!), eq(teamMembers.email, email)))
      .limit(1)

    if (existing.length > 0) {
      return res.status(409).json({ error: "Team member already invited" })
    }

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
      })

    const [member] = await getDb().select().from(teamMembers).where(eq(teamMembers.id, memberId)).limit(1)

    log.info({ memberId: member.id, email, role, userId: req.userId }, "Team member invited")
    return res.status(201).json(member)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to invite team member")
    return res.status(500).json({ error: "Failed to invite team member" })
  }
})

router.put("/:id", validate(updateTeamMemberSchema), async (req: AuthRequest, res: Response) => {
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

router.delete("/:id", async (req: AuthRequest, res: Response) => {
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
