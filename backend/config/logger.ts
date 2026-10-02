import pino from "pino"

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug")

export const logger = pino({
  level,
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino/file", options: { destination: 1 } }
    : undefined,
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

export function createContextLogger(context: Record<string, any>) {
  return logger.child(context)
}
