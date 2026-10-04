import { Queue, Worker, Job } from "bullmq"
import IORedis from "ioredis"
import { config } from "../config"
import { getDb } from "../config/database"
import { rules, stores } from "../models/schema"
import { eq } from "drizzle-orm"
import { RulesEngine } from "../services/rules-engine"
import { ShopifyService } from "../services/shopify"
import { sendEmail } from "../services/email"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "queue" })

let connection: IORedis | null = null
let redisAvailable = false
let connecting = false
const workers: Worker[] = []

function createConnection(): IORedis | null {
  if (!config.redis.url) return null

  const conn = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 10) return null
      return Math.min(times * 500, 5000)
    },
    connectTimeout: 5000,
  })

  conn.on("connect", () => {
    redisAvailable = true
    log.info("Redis connected")
  })
  conn.on("ready", () => {
    redisAvailable = true
  })
  conn.on("error", (err) => {
    if (redisAvailable) {
      log.warn({ err: err.message }, "Redis connection error")
    }
    redisAvailable = false
  })
  conn.on("close", () => {
    redisAvailable = false
  })
  conn.on("reconnecting", () => {
    log.info("Redis reconnecting...")
  })

  return conn
}

export async function initRedis(): Promise<boolean> {
  if (connection) return redisAvailable
  if (connecting) return false
  connecting = true

  try {
    connection = createConnection()
    if (!connection) {
      connecting = false
      return false
    }

    // Wait for connection with timeout
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 5000)
      connection!.once("ready", () => {
        clearTimeout(timeout)
        resolve()
      })
      connection!.once("error", () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    connecting = false
    return redisAvailable
  } catch {
    connecting = false
    redisAvailable = false
    return false
  }
}

function getConnection(): IORedis | null {
  if (!config.redis.url) return null
  if (!redisAvailable || !connection) return null
  return connection
}

export function isRedisAvailable(): boolean {
  return redisAvailable
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
    log.warn({ ruleId }, "[queue disabled] Rule evaluation would be queued")
    return null
  }
  return q.add("evaluate", { ruleId, eventData })
}

export async function addWebhookDelivery(url: string, payload: Record<string, any>): Promise<boolean> {
  const q = getWebhookDeliveryQueue()
  if (!q) {
    // Inline fallback
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return response.ok
    } catch (err) {
      log.error({ err, url }, "Webhook delivery failed (inline fallback)")
      return false
    }
  }
  try {
    await q.add("deliver", { url, payload })
    return true
  } catch (err) {
    log.error({ err, url }, "Failed to enqueue webhook delivery")
    // Inline fallback
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export async function addEmailJob(to: string, subject: string, html: string): Promise<boolean> {
  const q = getEmailQueue()
  if (!q) {
    // Inline fallback — send directly
    try {
      return await sendEmail({ to, subject, html })
    } catch (err) {
      log.error({ err, to }, "Email send failed (inline fallback)")
      return false
    }
  }
  try {
    await q.add("send", { to, subject, html })
    return true
  } catch (err) {
    log.error({ err, to }, "Failed to enqueue email, falling back to inline")
    try {
      return await sendEmail({ to, subject, html })
    } catch {
      return false
    }
  }
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
          id: rule.id,
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

export async function startWorkers(): Promise<void> {
  const connected = await initRedis()
  if (!connected) {
    log.warn("BullMQ workers not started (Redis unavailable) — inline fallbacks will be used")
    return
  }

  const conn = getConnection()
  if (!conn) return

  const ruleWorker = new Worker(
    "rule-evaluation",
    async (job: Job) => {
      const { ruleId, eventData } = job.data
      await evaluateRuleJob(ruleId, eventData)
    },
    { connection: conn, concurrency: 5 }
  ).on("completed", (job) => {
    log.debug({ jobId: job.id }, "Rule evaluation job completed")
  }).on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Rule evaluation job failed")
  })

  const webhookWorker = new Worker(
    "webhook-delivery",
    async (job: Job) => {
      const { url, payload } = job.data
      await deliverWebhookJob(url, payload)
    },
    { connection: conn, concurrency: 10 }
  ).on("completed", (job) => {
    log.debug({ jobId: job.id }, "Webhook delivery job completed")
  }).on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Webhook delivery job failed")
  })

  const emailWorker = new Worker(
    "email",
    async (job: Job) => {
      const { to, subject, html } = job.data
      await sendEmailJob(to, subject, html)
    },
    { connection: conn, concurrency: 3 }
  ).on("completed", (job) => {
    log.debug({ jobId: job.id }, "Email job completed")
  }).on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Email job failed")
  })

  workers.push(ruleWorker, webhookWorker, emailWorker)
  log.info("BullMQ workers started (rule-evaluation, webhook-delivery, email)")
}

export async function stopWorkers(): Promise<void> {
  log.info("Stopping BullMQ workers...")
  try {
    await Promise.all(workers.map((w) => w.close().catch(() => {})))
  } catch {
    // Ignore worker close errors
  }
  workers.length = 0
  if (connection && redisAvailable) {
    try {
      await connection.quit()
    } catch {
      try { connection.disconnect() } catch { /* ignore */ }
    }
    connection = null
  } else if (connection) {
    try { connection.disconnect() } catch { /* ignore */ }
    connection = null
  }
  redisAvailable = false
  log.info("BullMQ workers stopped")
}

export async function getQueueHealth(): Promise<{ redis: boolean; queues: Record<string, number> }> {
  const queues: Record<string, number> = {}
  const ruleQ = getRuleEvaluationQueue()
  const webhookQ = getWebhookDeliveryQueue()
  const emailQ = getEmailQueue()

  if (ruleQ) queues["rule-evaluation"] = await ruleQ.getWaiting().then((j) => j.length).catch(() => 0)
  if (webhookQ) queues["webhook-delivery"] = await webhookQ.getWaiting().then((j) => j.length).catch(() => 0)
  if (emailQ) queues["email"] = await emailQ.getWaiting().then((j) => j.length).catch(() => 0)

  return { redis: redisAvailable, queues }
}

// Standalone worker mode: run this file directly or set RUN_WORKER=true
const isMainModule = require.main === module || process.env.RUN_WORKER === "true"
if (isMainModule) {
  async function runWorker() {
    log.info("Starting standalone BullMQ worker...")
    await startWorkers()
    log.info("Worker running. Press Ctrl+C to stop.")

    const shutdown = async () => {
      log.info("Shutdown signal received")
      await stopWorkers()
      process.exit(0)
    }
    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)
  }
  runWorker().catch((err) => {
    log.fatal({ err }, "Worker failed to start")
    process.exit(1)
  })
}
