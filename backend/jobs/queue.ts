import { Queue, Worker, Job } from "bullmq"
import IORedis from "ioredis"
import { config } from "../config"
import { getDb } from "../config/database"
import { rules, orders, stores, users, webhooks } from "../models/schema"
import { eq, and } from "drizzle-orm"
import { RulesEngine } from "../services/rules-engine"
import { ShopifyService } from "../services/shopify"
import { sendEmail } from "../services/email"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "queue" })

let connection: IORedis | null = null
let redisAvailable = false

function getConnection(): IORedis | null {
  if (!config.redis.url) return null
  if (!redisAvailable && connection) return null

  if (!connection) {
    try {
      connection = new IORedis(config.redis.url, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: () => null,
        lazyConnect: true,
        connectTimeout: 3000,
        enableReadyCheck: false,
      })

      connection.on("connect", () => { redisAvailable = true })
      connection.on("error", () => { redisAvailable = false })
    } catch {
      return null
    }
  }

  if (!redisAvailable) return null
  return connection
}

let _ruleEvaluationQueue: Queue | null = null
let _webhookDeliveryQueue: Queue | null = null
let _emailQueue: Queue | null = null

function createQueue(name: string): Queue | null {
  const conn = getConnection()
  if (!conn) return null
  try {
    return new Queue(name, {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    })
  } catch {
    return null
  }
}

export function getRuleEvaluationQueue(): Queue | null {
  if (!_ruleEvaluationQueue) _ruleEvaluationQueue = createQueue("rule-evaluation")
  return _ruleEvaluationQueue
}

export function getWebhookDeliveryQueue(): Queue | null {
  if (!_webhookDeliveryQueue) _webhookDeliveryQueue = createQueue("webhook-delivery")
  return _webhookDeliveryQueue
}

export function getEmailQueue(): Queue | null {
  if (!_emailQueue) _emailQueue = createQueue("email")
  return _emailQueue
}

export async function addRuleEvaluation(ruleId: string, eventData: Record<string, any>) {
  const q = getRuleEvaluationQueue()
  if (!q) {
    console.log(`[queue disabled] Would evaluate rule ${ruleId}`)
    return
  }
  return q.add("evaluate", { ruleId, eventData })
}

export async function addWebhookDelivery(url: string, payload: Record<string, any>) {
  const q = getWebhookDeliveryQueue()
  if (!q) {
    console.log(`[queue disabled] Would deliver webhook to ${url}`)
    return
  }
  return q.add("deliver", { url, payload })
}

export async function addEmailJob(to: string, subject: string, html: string) {
  const q = getEmailQueue()
  if (!q) {
    console.log(`[queue disabled] Would send email to ${to}`)
    return
  }
  return q.add("send", { to, subject, html })
}

async function evaluateRuleJob(ruleId: string, eventData: Record<string, any>) {
  try {
    const db = getDb()
    const [rule] = await db.select().from(rules).where(eq(rules.id, ruleId)).limit(1)
    if (!rule) {
      log.warn({ ruleId }, "Rule not found")
      return
    }

    if (rule.status !== "active") {
      log.warn({ ruleId }, "Rule not active, skipping")
      return
    }

    let shopify: ShopifyService | undefined
    if (rule.storeId) {
      const [store] = await db.select().from(stores).where(eq(stores.id, rule.storeId)).limit(1)
      if (store) {
        shopify = new ShopifyService(store.domain, store.accessToken)
      }
    }

    const engine = new RulesEngine(shopify)
    const conditions = rule.conditions as any[]
    const logic = rule.logic as "all" | "any"

    const matches = engine.evaluate(conditions, eventData, logic)

    if (matches) {
      await db.update(rules)
        .set({ triggerCount: (rule.triggerCount || 0) + 1, lastTriggeredAt: new Date().toISOString() })
        .where(eq(rules.id, ruleId))

      await engine.executeWithAI(
        {
          name: rule.name,
          description: rule.description || "",
          conditions: rule.conditions as any[],
          actions: rule.actions as any[],
        },
        eventData
      )

      log.info({ ruleId, ruleName: rule.name }, "Rule triggered and AI decision executed")
    }
  } catch (error) {
    log.error({ err: error, ruleId }, "Error evaluating rule")
    throw error
  }
}

async function deliverWebhookJob(url: string, payload: Record<string, any>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status}`)
  }
}

async function sendEmailJob(to: string, subject: string, html: string) {
  await sendEmail({ to, subject, html })
}

export function startWorkers(): void {
  const conn = getConnection()
  if (!conn) {
    console.log("BullMQ workers not started (Redis unavailable)")
    return
  }

  new Worker(
    "rule-evaluation",
    async (job: Job) => {
      const { ruleId, eventData } = job.data
      await evaluateRuleJob(ruleId, eventData)
    },
    { connection: conn, concurrency: 5 }
  ).on("completed", (job) => {
    console.log(`Rule evaluation job ${job.id} completed`)
  }).on("failed", (job, err) => {
    console.error(`Rule evaluation job ${job?.id} failed:`, err)
  })

  new Worker(
    "webhook-delivery",
    async (job: Job) => {
      const { url, payload } = job.data
      await deliverWebhookJob(url, payload)
    },
    { connection: conn, concurrency: 10 }
  ).on("completed", (job) => {
    console.log(`Webhook delivery job ${job.id} completed`)
  }).on("failed", (job, err) => {
    console.error(`Webhook delivery job ${job?.id} failed:`, err)
  })

  new Worker(
    "email",
    async (job: Job) => {
      const { to, subject, html } = job.data
      await sendEmailJob(to, subject, html)
    },
    { connection: conn, concurrency: 3 }
  ).on("completed", (job) => {
    console.log(`Email job ${job.id} completed`)
  }).on("failed", (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err)
  })

  console.log("BullMQ workers started")
}
