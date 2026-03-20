/**
 * Pricing Cascade Migration
 * Adds numeric price fields to gsPricing and volumeTiers,
 * and cascade pricing fields to deals.
 * 
 * Run: DATABASE_URL=... npx tsx server/migrate-cascade.ts
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function migrate() {
  console.log("running pricing cascade migration...\n");

  // ─── GS Pricing: add priceNumeric and isBasePrice ───
  console.log("1. adding columns to gs_pricing...");
  await db.execute(sql`
    ALTER TABLE gs_pricing
    ADD COLUMN IF NOT EXISTS price_numeric REAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_base_price BOOLEAN DEFAULT false
  `);

  // Backfill priceNumeric from pricePerGs text field (strip £ and parse)
  await db.execute(sql`
    UPDATE gs_pricing
    SET price_numeric = CASE
      WHEN price_per_gs ~ '[0-9]+\.?[0-9]*' THEN
        CAST(regexp_replace(price_per_gs, '[^0-9.]', '', 'g') AS REAL)
      ELSE 0
    END
    WHERE price_numeric = 0 OR price_numeric IS NULL
  `);

  // Mark the base price tier (highest priceNumeric = Standard Retail at £0.12)
  // The base price is the undiscounted rate — the standard retail price
  await db.execute(sql`
    UPDATE gs_pricing SET is_base_price = false
  `);
  await db.execute(sql`
    UPDATE gs_pricing SET is_base_price = true
    WHERE tier_name = 'Standard Retail'
  `);
  console.log("   ✓ gs_pricing columns added and backfilled");

  // ─── Volume Tiers: add priceNumeric and basePriceAtSet ───
  console.log("2. adding columns to volume_tiers...");
  await db.execute(sql`
    ALTER TABLE volume_tiers
    ADD COLUMN IF NOT EXISTS price_numeric REAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS base_price_at_set REAL DEFAULT 0
  `);

  // Backfill priceNumeric from pricePerGs text field
  await db.execute(sql`
    UPDATE volume_tiers
    SET price_numeric = CASE
      WHEN price_per_gs ~ '[0-9]+\.?[0-9]*' THEN
        CAST(regexp_replace(price_per_gs, '[^0-9.]', '', 'g') AS REAL)
      ELSE 0
    END
    WHERE price_numeric = 0 OR price_numeric IS NULL
  `);

  // Set basePriceAtSet to 0.005 (the new agreed base price — £0.005/GS for major retailers)
  // This is the reference point: when admin set these tier prices, the base was this
  // We'll use the Standard Retail price as the base since it's the undiscounted rate
  await db.execute(sql`
    UPDATE volume_tiers
    SET base_price_at_set = (SELECT price_numeric FROM gs_pricing WHERE is_base_price = true LIMIT 1)
    WHERE base_price_at_set = 0 OR base_price_at_set IS NULL
  `);
  console.log("   ✓ volume_tiers columns added and backfilled");

  // ─── Deals: add cascade pricing fields ───
  console.log("3. adding cascade columns to deals...");
  await db.execute(sql`
    ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS volume_tier_id INTEGER,
    ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage',
    ADD COLUMN IF NOT EXISTS discount_value REAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS effective_price REAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cascade_flagged BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS cascade_flagged_at TIMESTAMP
  `);

  // Backfill: parse existing price text to effective_price numeric
  await db.execute(sql`
    UPDATE deals
    SET effective_price = CASE
      WHEN price ~ '[0-9]+\.?[0-9]*' THEN
        CAST(regexp_replace(price, '[^0-9.]', '', 'g') AS REAL)
      ELSE 0
    END
    WHERE effective_price = 0 OR effective_price IS NULL
  `);

  // Attempt to link deals to volume tiers based on their level field
  await db.execute(sql`
    UPDATE deals d
    SET volume_tier_id = vt.id
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
      FROM volume_tiers
    ) vt
    WHERE d.level = vt.rn AND d.volume_tier_id IS NULL
  `);

  // Set discount_type and discount_value based on existing prices
  // Deals with a specific price are treated as fixed overrides
  await db.execute(sql`
    UPDATE deals
    SET discount_type = 'percentage', discount_value = 0
    WHERE discount_type IS NULL OR discount_type = ''
  `);

  console.log("   ✓ deals cascade columns added and backfilled");

  console.log("\n✅ pricing cascade migration complete!");
  await pool.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
