import "dotenv/config";
import { getDb } from "./db";
import { carbonMarkets, carbonMarketHistory } from "@shared/schema";

async function seed() {
  const db = getDb();

  // ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS carbon_market_history (
      id SERIAL PRIMARY KEY,
      market_id INTEGER NOT NULL,
      price REAL NOT NULL,
      recorded_at TIMESTAMP NOT NULL
    )
  `);

  const markets = await db.select().from(carbonMarkets);

  // base prices per market (approximate real-world values in local currency units)
  const basePrices: Record<string, number> = {
    "EU ETS (EUA)": 72,
    "UK ETS (UKA)": 40,
    "California CCA": 35,
    "RGGI": 14,
    "NZ ETS": 50,
    "Korea ETS": 8.5,
    "Voluntary (Verra VCS)": 7,
    "Voluntary (Gold Standard)": 10,
  };

  const now = new Date();

  for (const market of markets) {
    const basePrice = basePrices[market.name] || 10;
    const records = [];

    // generate 52 weeks of data (1 year)
    for (let week = 51; week >= 0; week--) {
      const date = new Date(now);
      date.setDate(date.getDate() - week * 7);

      // random walk with slight upward trend
      const trend = (51 - week) * 0.05;
      const noise = (Math.random() - 0.45) * basePrice * 0.04;
      const seasonality = Math.sin(((51 - week) / 52) * Math.PI * 2) * basePrice * 0.03;
      const price = Math.max(basePrice * 0.8, basePrice + trend + noise + seasonality);

      records.push({
        marketId: market.id,
        price: Math.round(price * 100) / 100,
        recordedAt: date,
      });
    }

    await db.insert(carbonMarketHistory).values(records);
    console.log(`seeded ${records.length} history records for ${market.name}`);
  }

  console.log("done!");
  process.exit(0);
}

seed().catch(console.error);
