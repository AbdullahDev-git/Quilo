import { Router, Response } from "express"
import { getDb } from "../config/database"
import { rules } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { audit } from "../middleware/audit"
import { eq, and } from "drizzle-orm"
import { validate, createRuleSchema, updateRuleSchema } from "../middleware/validate"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "rules" })
const router = Router()

router.use(authenticate)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userRules = await getDb()
      .select()
      .from(rules)
      .where(eq(rules.userId, req.userId!))
      .orderBy(rules.priority)

    return res.json(userRules)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch rules")
    return res.status(500).json({ error: "Failed to fetch rules" })
  }
})

router.post("/", audit("rule.created"), validate(createRuleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, conditions, actions, logic, storeId, status, priority } = req.body

    // Normalize: merge params into config if present
    const normalizedActions = actions.map((a: any) => ({
      type: a.type,
      config: { ...a.config, ...a.params },
    }))

    const ruleId = crypto.randomUUID()
    await getDb()
      .insert(rules)
      .values({
        id: ruleId,
        userId: req.userId!,
        storeId,
        name,
        description,
        conditions,
        actions: normalizedActions,
        logic: logic || "all",
        priority: priority ?? 0,
        status: status || "active",
      })

    const [rule] = await getDb().select().from(rules).where(eq(rules.id, ruleId)).limit(1)

    log.info({ ruleId: rule.id, userId: req.userId }, "Rule created")
    return res.status(201).json(rule)
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to create rule")
    return res.status(500).json({ error: "Failed to create rule" })
  }
})

router.put("/:id", audit("rule.updated"), validate(updateRuleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Normalize: merge params into config if present
    if (updates.actions) {
      updates.actions = updates.actions.map((a: any) => ({
        type: a.type,
        config: { ...a.config, ...a.params },
      }))
    }

    await getDb()
      .update(rules)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(rules.id, id), eq(rules.userId, req.userId!)))

    const [rule] = await getDb().select().from(rules).where(and(eq(rules.id, id), eq(rules.userId, req.userId!))).limit(1)

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" })
    }

    log.info({ ruleId: id, userId: req.userId }, "Rule updated")
    return res.json(rule)
  } catch (error) {
    log.error({ err: error, ruleId: req.params.id }, "Failed to update rule")
    return res.status(500).json({ error: "Failed to update rule" })
  }
})

router.delete("/:id", audit("rule.deleted"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const [existing] = await getDb().select().from(rules).where(and(eq(rules.id, id), eq(rules.userId, req.userId!))).limit(1)
    if (!existing) {
      return res.status(404).json({ error: "Rule not found" })
    }

    await getDb().delete(rules).where(and(eq(rules.id, id), eq(rules.userId, req.userId!)))

    log.info({ ruleId: id, userId: req.userId }, "Rule deleted")
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, ruleId: req.params.id }, "Failed to delete rule")
    return res.status(500).json({ error: "Failed to delete rule" })
  }
})

export default router
