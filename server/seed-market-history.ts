import "dotenv/config";
import { getDb } from "./db";
import { carbonMarkets, carbonMarketHistory } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * realistic carbon market price trajectories (march 2025 → march 2026)
 * based on actual market trends. each market has its own characteristic pattern.
 */

interface MarketTrajectory {
  name: string;
  // 13 monthly anchor points (mar 2025 → mar 2026), interpolated to weekly
  anchors: number[];
}

const trajectories: MarketTrajectory[] = [
  {
    // EU ETS: started ~€80, dipped to ~€65 by dec 2025, partial recovery to €72 by feb, fell to €67 by mar 2026
    name: "EU ETS (EUA)",
    anchors: [80, 78, 76, 73, 70, 68, 66, 65, 65, 67, 70, 72, 67],
  },
  {
    // UK ETS: £35-£45 range, generally following EU but lower
    name: "UK ETS (UKA)",
    anchors: [38, 39, 41, 43, 44, 43, 40, 38, 36, 37, 40, 43, 42.8],
  },
  {
    // California CaT: $32-$38, steady upward
    name: "California CaT",
    anchors: [32, 32.5, 33, 33.2, 33.8, 34, 34.5, 34.8, 35, 35.2, 35, 35.5, 35.1],
  },
  {
    // RGGI: $13-$16, gradual increase
    name: "RGGI",
    anchors: [13.2, 13.5, 13.8, 14.0, 14.2, 14.5, 14.3, 14.6, 14.8, 15.0, 15.2, 15.3, 15.4],
  },
  {
    // NZ ETS: NZ$45-$55, volatile
    name: "NZ ETS",
    anchors: [52, 54, 55, 53, 50, 47, 45, 46, 48, 51, 53, 50, 48.5],
  },
  {
    // Korea ETS: ₩8,000-₩10,000 range (stored as numeric thousands)
    name: "Korea ETS",
    anchors: [8.2, 8.5, 8.8, 9.0, 9.3, 9.5, 9.2, 9.0, 8.8, 9.0, 9.1, 9.3, 9.2],
  },
  {
    // China National ETS: ¥65-¥75, gradual increase
    name: "China National ETS",
    anchors: [65, 66, 67, 68, 69, 70, 70.5, 71, 71.5, 72, 72.5, 73, 72],
  },
  {
    // Swiss ETS: CHF 60-70, tracks EU closely
    name: "Swiss ETS",
    anchors: [68, 67, 66, 65, 64, 63, 62, 61, 61, 62, 64, 66, 65.2],
  },
  {
    // Canada OBPS: C$60-70, steady increase
    name: "Canada OBPS",
    anchors: [60, 61, 62, 62.5, 63, 63.5, 64, 64.5, 65, 65.5, 65, 65.5, 65],
  },
  {
    // Verra VCS (voluntary): $6-$9, declining from oversupply
    name: "Voluntary (Verra VCS)",
    anchors: [9.0, 8.8, 8.5, 8.2, 8.0, 7.8, 7.5, 7.3, 7.2, 7.0, 7.1, 7.3, 7.2],
  },
  {
    // Gold Standard (voluntary): $10-$14, more stable
    name: "Voluntary (Gold Standard)",
    anchors: [12.5, 12.8, 13.0, 13.2, 13.5, 13.0, 12.5, 12.0, 11.5, 11.8, 12.0, 11.9, 11.8],
  },
];

/** linearly interpolate monthly anchors to weekly data points with noise */
function interpolateToWeekly(anchors: number[], weeks: number): number[] {
  const result: number[] = [];
  for (let w = 0; w < weeks; w++) {
    // map week to anchor position (0..12 for 13 anchors over 52 weeks)
    const pos = (w / (weeks - 1)) * (anchors.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, anchors.length - 1);
    const frac = pos - lo;
    const base = anchors[lo] + (anchors[hi] - anchors[lo]) * frac;

    // add small random noise (±1.5% of price)
    const noise = (Math.random() - 0.5) * base * 0.03;
    result.push(Math.round((base + noise) * 100) / 100);
  }
  return result;
}

async function seed() {
  const db = getDb();

  // ensure table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS carbon_market_history (
      id SERIAL PRIMARY KEY,
      market_id INTEGER NOT NULL,
      price REAL NOT NULL,
      recorded_at TIMESTAMP NOT NULL
    )
  `);

  // clear existing history
  await db.execute(sql`DELETE FROM carbon_market_history`);
  console.log("cleared existing history data");

  const markets = await db.select().from(carbonMarkets);

  const startDate = new Date("2025-03-21");
  const WEEKS = 52;

  for (const trajectory of trajectories) {
    const market = markets.find((m) => m.name === trajectory.name);
    if (!market) {
      console.log(`skipping ${trajectory.name} — not found in carbon_markets table`);
      continue;
    }

    const weeklyPrices = interpolateToWeekly(trajectory.anchors, WEEKS);
    const records = weeklyPrices.map((price, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 7);
      return {
        marketId: market.id,
        price,
        recordedAt: date,
      };
    });

    await db.insert(carbonMarketHistory).values(records);
    console.log(`seeded ${records.length} history records for ${market.name} (${weeklyPrices[0]} → ${weeklyPrices[weeklyPrices.length - 1]})`);
  }

  console.log("done!");
  process.exit(0);
}

seed().catch(console.error);
