import { getDb } from "../config/database"
import { auditLogs } from "../models/schema"
import { AuthRequest } from "./auth"
import { Response, NextFunction } from "express"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "audit" })

export function audit(event: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      getDb().insert(auditLogs).values({
        userId: req.userId || undefined,
        event,
        description: `${event} - ${req.method} ${req.path}`,
        metadata: { statusCode: res.statusCode },
        ipAddress: req.ip || req.socket.remoteAddress,
      }).catch((err) => log.error({ err, event }, "Audit log failed"))

      return originalJson(body)
    }

    next()
  }
}
