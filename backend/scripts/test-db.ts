import dotenv from "dotenv"
dotenv.config({ path: "../../.env" })

import postgres from "postgres"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in environment variables")
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } })

  try {
    const result = await sql`SELECT 1 as ok`
    console.log("Connected!", result)
  } catch (e) {
    console.error("Error:", (e as Error).message)
  } finally {
    await sql.end()
  }
}

main()
