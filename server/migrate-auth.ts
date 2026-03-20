/**
 * Auth Migration Script
 * Adds users table and seeds default admin
 * Run: DATABASE_URL=... npx tsx server/migrate-auth.ts
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { users } from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function migrate() {
  console.log("═══════════════════════════════════════════");
  console.log("  mcp auth migration");
  console.log("═══════════════════════════════════════════\n");

  // 1. Create users table
  console.log("creating users table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      active BOOLEAN NOT NULL DEFAULT true,
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("  ✓ users table created");

  // 2. Create index
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)
  `);
  console.log("  ✓ username index created");

  // 3. Seed default admin
  console.log("\nseeding default admin user...");
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash("McpAdmin2026!", salt);

  const result = await db.insert(users).values({
    username: "admin",
    passwordHash: hash,
    displayName: "mcp administrator",
    role: "super_admin",
    active: true,
    mustChangePassword: true,
  }).onConflictDoNothing().returning();

  if (result.length > 0) {
    console.log("  ✓ default admin created (admin / McpAdmin2026!)");
  } else {
    console.log("  ⊘ admin user already exists — skipped");
  }

  // 4. Session table (connect-pg-simple creates it, but let's ensure)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire")
  `);
  console.log("  ✓ session table created");

  console.log("\n✅ auth migration complete!");
  console.log("   default login: admin / McpAdmin2026!");
  console.log("   (password change required on first login)\n");

  await pool.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
