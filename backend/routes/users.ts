import { Router, Response } from "express"
import { getDb } from "../config/database"
import { users } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq } from "drizzle-orm"
import { validate, updateProfileSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "users" })
const router = Router()

router.use(authenticate)

router.get("/me", async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await getDb().select().from(users).where(eq(users.id, req.userId!)).limit(1)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    return res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch user")
    return res.status(500).json({ error: "Failed to fetch user" })
  }
})

router.put("/me", validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    await getDb()
      .update(users)
      .set({
        name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, req.userId!))
    const [user] = await getDb().select().from(users).where(eq(users.id, req.userId!)).limit(1)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    log.info({ userId: req.userId }, "Profile updated")
    return res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to update profile")
    return res.status(500).json({ error: "Failed to update user" })
  }
})

export default router
