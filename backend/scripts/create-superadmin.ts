import bcrypt from "bcryptjs"
import { generateSecret, generateURI } from "otplib"
import { getDb, initDatabase } from "../config/database"
import { admins } from "../models/schema"
import { config } from "../config"

/**
 * Script to create the initial superadmin account.
 * Run with: npx tsx backend/scripts/create-superadmin.ts
 */

async function createSuperadmin() {
  await initDatabase()

  const email = process.argv[2] || "admin@quilo.io"
  const password = process.argv[3] || "SuperAdmin123!"
  const name = process.argv[4] || "Platform Admin"

  console.log("Creating superadmin account...")
  console.log(`Email: ${email}`)
  console.log(`Name: ${name}`)

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Generate TOTP secret (will be used for 2FA setup)
  const totpSecret = generateSecret()

  // Create admin
  const adminId = crypto.randomUUID()
  await getDb()
    .insert(admins)
    .values({
      id: adminId,
      email,
      name,
      passwordHash,
      totpSecret,
      totpEnabled: "false", // Will be enabled after first login 2FA setup
    })
    .onConflictDoNothing()

  console.log("\nSuperadmin account created successfully!")
  console.log(`Admin ID: ${adminId}`)
  console.log("\nNext steps:")
  console.log("1. Login at /superadmin/login")
  console.log("2. Set up 2FA from the dashboard")
  console.log("\nTOTP Secret (for initial setup):")
  console.log(totpSecret)
  console.log("\nAdd to your authenticator app using:")
  console.log(generateURI({
    issuer: config.superadmin.totpIssuer,
    label: email,
    secret: totpSecret,
  }))
}

createSuperadmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to create superadmin:", err)
    process.exit(1)
  })
