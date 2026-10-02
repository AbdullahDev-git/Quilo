import { defineConfig } from "drizzle-kit"

const dbUrl = process.env.DATABASE_URL || ""

export default defineConfig({
  schema: "./backend/models/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
})
