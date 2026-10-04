import { Router, Response } from "express"
import { AuthRequest, authenticate } from "../middleware/auth"
import { createLemonSqueezyService } from "../services/lemon-squeezy"
import { getUserPlan, getTeamSeatUsage } from "../services/billing"
import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "lemon-squeezy-routes" })
const router = Router()

router.use(authenticate)

// Get current user's subscription/plan + team seat usage
router.get("/subscription", async (req: AuthRequest, res: Response) => {
  try {
    const plan = await getUserPlan(req.userId!)
    const seats = await getTeamSeatUsage(req.userId!)
    return res.json({ ...plan, seats })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to fetch subscription")
    return res.status(500).json({ error: "Failed to fetch subscription" })
  }
})

router.post("/checkout", async (req: AuthRequest, res: Response) => {
  try {
    const { variantId } = req.body
    if (!variantId) {
      return res.status(400).json({ error: "variantId is required" })
    }

    const service = createLemonSqueezyService()
    if (!service) {
      return res.status(503).json({ error: "Lemon Squeezy not configured" })
    }

    const successUrl = `${config.frontendUrl}/dashboard/billing?success=true`
    const cancelUrl = `${config.frontendUrl}/dashboard/billing?cancelled=true`

    const checkout = await service.createCheckout(
      variantId,
      { user_id: req.userId! },
      successUrl,
      cancelUrl
    )

    return res.json({ url: checkout.data.attributes.url })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to create checkout")
    return res.status(500).json({ error: "Failed to create checkout" })
  }
})

router.get("/products", async (req: AuthRequest, res: Response) => {
  try {
    const service = createLemonSqueezyService()
    if (!service) {
      return res.status(503).json({ error: "Lemon Squeezy not configured" })
    }

    const products = await service.listProducts()
    return res.json(products)
  } catch (error) {
    log.error({ err: error }, "Failed to list products")
    return res.status(500).json({ error: "Failed to list products" })
  }
})

router.post("/cancel-subscription", async (req: AuthRequest, res: Response) => {
  try {
    const { subscriptionId } = req.body
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId is required" })
    }

    const service = createLemonSqueezyService()
    if (!service) {
      return res.status(503).json({ error: "Lemon Squeezy not configured" })
    }

    await service.cancelSubscription(subscriptionId)
    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Failed to cancel subscription")
    return res.status(500).json({ error: "Failed to cancel subscription" })
  }
})

export default router
