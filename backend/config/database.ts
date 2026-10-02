import { config } from "./index"
import * as schema from "../models/schema"

let db: any

export async function initDatabase() {
  const dbUrl = config.database.url

  if (!dbUrl || !dbUrl.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/quilo). " +
      "Set it in your .env file. SQLite is no longer supported as the schema uses PostgreSQL types."
    )
  }

  const { drizzle } = await import("drizzle-orm/postgres-js")
  const postgres = (await import("postgres")).default

  const client = postgres(dbUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  db = drizzle(client, { schema })
  console.log("Connected to PostgreSQL")
}

export function getDb() {
  return db
}

export async function testConnection() {
  try {
    if (!db) return false
    const { sql } = await import("drizzle-orm")
    await db.execute(sql`SELECT 1`)
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}
