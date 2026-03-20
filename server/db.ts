import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  db = drizzle(pool, { schema });
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) throw new Error("DATABASE_URL not set — database not available");
  return db;
}

export function getPool(): Pool {
  if (!pool) throw new Error("DATABASE_URL not set — pool not available");
  return pool;
}
