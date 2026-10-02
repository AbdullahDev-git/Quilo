import { Request, Response, NextFunction } from "express"
import { z } from "zod"

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      return res.status(400).json({ error: "Validation failed", details: errors })
    }
    req.body = result.data
    next()
  }
}

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
})

export const createRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(200),
  description: z.string().max(1000).optional(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "contains", "not_contains", "starts_with", "ends_with", "in", "not_in", "is_set", "is_not_set"]),
    value: z.any(),
  })).min(1, "At least one condition is required"),
  actions: z.array(z.object({
    type: z.enum([
      "refund", "email", "webhook", "flag", "tag", "notify",
      "offer_exchange", "offer_store_credit", "escalate", "hold", "auto_approve",
      "Auto-refund", "Offer exchange", "Flag for manual review", "Auto-deny return",
      "Instant refund", "Send email notification", "Fulfill order", "Create discount",
      "Update product", "Send webhook", "Update order tags",
    ]),
    config: z.record(z.any()).optional(),
    params: z.record(z.any()).optional(),
  })).min(1, "At least one action is required"),
  logic: z.enum(["all", "any"]).optional().default("all"),
  priority: z.number().int().min(0).max(100).optional().default(0),
  status: z.enum(["active", "paused", "draft"]).optional().default("active"),
  storeId: z.string().uuid().optional().nullable(),
})

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "contains", "not_contains", "starts_with", "ends_with", "in", "not_in", "is_set", "is_not_set"]),
    value: z.any(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum([
      "refund", "email", "webhook", "flag", "tag", "notify",
      "offer_exchange", "offer_store_credit", "escalate", "hold", "auto_approve",
      "Auto-refund", "Offer exchange", "Flag for manual review", "Auto-deny return",
      "Instant refund", "Send email notification", "Fulfill order", "Create discount",
      "Update product", "Send webhook", "Update order tags",
    ]),
    config: z.record(z.any()).optional(),
    params: z.record(z.any()).optional(),
  })).optional(),
  logic: z.enum(["all", "any"]).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  status: z.enum(["active", "paused", "draft"]).optional(),
})

export const createStoreSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().min(1, "Store domain is required").max(500),
  accessToken: z.string().min(1, "Access token is required"),
  platform: z.string().optional(),
})

export const connectStoreSchema = z.object({
  shop: z.string().min(1, "Shop domain is required").regex(/\.myshopify\.com$/, "Must be a valid Shopify domain"),
  code: z.string().min(1, "Authorization code is required"),
})

export const syncOrdersSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
})

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1).optional(),
  returnStatus: z.enum(["pending", "approved", "rejected", "auto_approved", "flagged"]).optional(),
  returnReason: z.string().max(500).optional().nullable(),
})

// Step 10: Partial refund schema
export const partialRefundSchema = z.object({
  lineItems: z.array(z.object({
    itemId: z.number().int().positive("Invalid item ID"),
    quantity: z.number().int().positive("Quantity must be positive"),
    amount: z.string().optional(),
  })).min(1, "At least one line item is required"),
  reason: z.string().max(500).optional(),
})

// Chat schemas
export const chatMessageSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  message: z.string().min(1, "Message is required").max(2000),
  conversationId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
})

export const createChatSessionSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
})

export const createWebhookSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
  topic: z.string().min(1, "Webhook topic is required"),
  endpoint: z.string().url("Invalid endpoint URL"),
})

export const updateWebhookSchema = z.object({
  topic: z.string().min(1).optional(),
  endpoint: z.string().url("Invalid endpoint URL").optional(),
  status: z.enum(["active", "paused", "error"]).optional(),
})

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  config: z.record(z.any()),
})

export const updateSpendCapSchema = z.object({
  limit: z.number().positive("Limit must be a positive number").max(1000000, "Limit too high"),
})

export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().max(100).optional(),
  role: z.enum(["admin", "manager", "member"]).optional().default("member"),
})

export const updateTeamMemberSchema = z.object({
  role: z.enum(["admin", "manager", "member"]),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
})
