/**
 * Database Seed Script
 * Populates all tables with the same demo data as MemStorage
 * Run: DATABASE_URL=... npx tsx server/seed.ts
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  users,
  retailers, products, retailerProducts, countries, deals,
  volumeTiers, gsPricing, equivalenceConfig, valueProtection,
  carbonMarkets, c2050Streams, regulatoryUpdates, systemStatus,
  changeLog, approvalQueue,
} from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

function computeGsTotal(baseGs: number, retailerGs: number, gsMatchPolicy?: string, gsMatchValue?: number): number {
  if (gsMatchPolicy === "percentage") {
    const matchAmount = Math.round(baseGs * (gsMatchValue || 0) / 100);
    return baseGs + matchAmount;
  }
  if (gsMatchPolicy === "fixed") {
    return baseGs + (gsMatchValue || 0);
  }
  return baseGs + retailerGs;
}

async function seed() {
  console.log("seeding database...");

  // Clear existing data (in reverse dependency order)
  await db.delete(approvalQueue);
  await db.delete(changeLog);
  await db.delete(retailerProducts);
  await db.delete(products);
  await db.delete(retailers);
  await db.delete(countries);
  await db.delete(deals);
  await db.delete(volumeTiers);
  await db.delete(gsPricing);
  await db.delete(equivalenceConfig);
  await db.delete(valueProtection);
  await db.delete(carbonMarkets);
  await db.delete(c2050Streams);
  await db.delete(regulatoryUpdates);
  await db.delete(systemStatus);

  // Reset sequences
  await db.execute(sql`ALTER SEQUENCE retailers_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE products_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE retailer_products_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE countries_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE deals_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE volume_tiers_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE gs_pricing_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE equivalence_config_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE value_protection_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE carbon_markets_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE c2050_streams_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE regulatory_updates_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE system_status_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE change_log_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE approval_queue_id_seq RESTART WITH 1`);

  // ─── Retailers ───
  const retailerData = [
    { name: "Tesco", code: "TESCO", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 100, contactEmail: "gs@tesco.com", notes: "Full GS match — 100% of base GS" },
    { name: "Sainsbury's", code: "SAINS", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "fixed", gsMatchValue: 10, contactEmail: "sustainability@sainsburys.co.uk", notes: "Fixed 10 GS top-up per product" },
    { name: "Asda", code: "ASDA", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 50, contactEmail: "gs@asda.com", notes: "50% GS match on base" },
    { name: "Waitrose", code: "WAITR", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "fixed", gsMatchValue: 15, contactEmail: "partners@waitrose.com", notes: "Fixed 15 GS premium top-up" },
    { name: "Woolworths", code: "WOOLW", country: "AU", flag: "🇦🇺", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 75, contactEmail: "gs@woolworths.com.au", notes: "75% GS match — Australian pilot" },
    { name: "NTUC FairPrice", code: "NTUC", country: "SG", flag: "🇸🇬", status: "pending", gsMatchPolicy: "fixed", gsMatchValue: 5, contactEmail: "sustainability@fairprice.com.sg", notes: "Fixed 5 GS — Singapore trial" },
    { name: "Carrefour", code: "CARRF", country: "EU/FR", flag: "🇫🇷", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 50, contactEmail: "gs@carrefour.fr", notes: "50% GS match — EU expansion" },
    { name: "Whole Foods", code: "WHOLEF", country: "US", flag: "🇺🇸", status: "pending", gsMatchPolicy: "fixed", gsMatchValue: 8, contactEmail: "gs@wholefoods.com", notes: "Fixed 8 GS — US market entry" },
  ];
  const insertedRetailers = await db.insert(retailers).values(retailerData).returning();
  console.log(`  ✓ ${insertedRetailers.length} retailers`);

  // ─── Products ───
  const productData = [
    { name: "Heinz Baked Beans", sku: "HNZ-BB-400", brand: "Heinz", category: "grocery", baseGs: 10, carbonPct: 15, verified: true, status: "active", notes: "" },
    { name: "Heinz Tomato Ketchup", sku: "HNZ-TK-500", brand: "Heinz", category: "grocery", baseGs: 8, carbonPct: 12, verified: true, status: "active", notes: "" },
    { name: "Innocent Smoothie", sku: "INN-SM-750", brand: "Innocent", category: "beverages", baseGs: 15, carbonPct: 20, verified: true, status: "active", notes: "" },
    { name: "Quorn Mince", sku: "QRN-MC-300", brand: "Quorn", category: "protein", baseGs: 25, carbonPct: 10, verified: true, status: "active", notes: "" },
    { name: "Oatly Oat Milk", sku: "OAT-ML-1000", brand: "Oatly", category: "beverages", baseGs: 20, carbonPct: 18, verified: true, status: "active", notes: "" },
    { name: "Ben & Jerry's Ice Cream", sku: "BNJ-IC-500", brand: "Ben & Jerry's", category: "grocery", baseGs: 12, carbonPct: 14, verified: false, status: "active", notes: "" },
    { name: "Ecover Washing Liquid", sku: "ECO-WL-1500", brand: "Ecover", category: "household", baseGs: 18, carbonPct: 25, verified: true, status: "active", notes: "" },
    { name: "Method Hand Soap", sku: "MTH-HS-350", brand: "Method", category: "household", baseGs: 14, carbonPct: 22, verified: false, status: "active", notes: "" },
    { name: "Who Gives A Crap Toilet Paper", sku: "WGA-TP-48", brand: "WGAC", category: "household", baseGs: 30, carbonPct: 15, verified: true, status: "active", notes: "" },
    { name: "Tony's Chocolonely", sku: "TNY-CH-180", brand: "Tony's", category: "confectionery", baseGs: 22, carbonPct: 12, verified: true, status: "active", notes: "" },
    { name: "Clipper Organic Tea", sku: "CLP-OT-80", brand: "Clipper", category: "beverages", baseGs: 16, carbonPct: 20, verified: false, status: "active", notes: "" },
    { name: "Seed & Bean Dark Chocolate", sku: "SNB-DC-85", brand: "Seed & Bean", category: "confectionery", baseGs: 19, carbonPct: 16, verified: true, status: "active", notes: "" },
  ];
  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`  ✓ ${insertedProducts.length} products`);

  // ─── Retailer-Product Offers ───
  // Build a map for GS computation
  const retailerMap = new Map(insertedRetailers.map(r => [r.id, r]));
  const productMap = new Map(insertedProducts.map(p => [p.id, p]));

  const offerInputs = [
    // Tesco (100% match) — 7 products
    { retailerId: 1, productId: 1, retailerGs: 10, priceLocal: "£0.85" },
    { retailerId: 1, productId: 2, retailerGs: 8, priceLocal: "£2.99" },
    { retailerId: 1, productId: 3, retailerGs: 15, priceLocal: "£2.50" },
    { retailerId: 1, productId: 5, retailerGs: 20, priceLocal: "£1.80" },
    { retailerId: 1, productId: 6, retailerGs: 12, priceLocal: "£4.50" },
    { retailerId: 1, productId: 10, retailerGs: 22, priceLocal: "£3.50" },
    { retailerId: 1, productId: 11, retailerGs: 16, priceLocal: "£2.20" },
    // Sainsbury's (fixed 10) — 6 products
    { retailerId: 2, productId: 1, retailerGs: 10, priceLocal: "£0.90" },
    { retailerId: 2, productId: 2, retailerGs: 10, priceLocal: "£3.15" },
    { retailerId: 2, productId: 4, retailerGs: 10, priceLocal: "£2.00" },
    { retailerId: 2, productId: 7, retailerGs: 10, priceLocal: "£3.50" },
    { retailerId: 2, productId: 9, retailerGs: 10, priceLocal: "£12.00" },
    { retailerId: 2, productId: 12, retailerGs: 10, priceLocal: "£2.80" },
    // Asda (50% match) — 6 products
    { retailerId: 3, productId: 1, retailerGs: 5, priceLocal: "£0.80" },
    { retailerId: 3, productId: 3, retailerGs: 8, priceLocal: "£2.30" },
    { retailerId: 3, productId: 5, retailerGs: 10, priceLocal: "£1.65" },
    { retailerId: 3, productId: 6, retailerGs: 6, priceLocal: "£4.00" },
    { retailerId: 3, productId: 8, retailerGs: 7, priceLocal: "£2.50" },
    { retailerId: 3, productId: 10, retailerGs: 11, priceLocal: "£3.20" },
    // Waitrose (fixed 15) — 5 products
    { retailerId: 4, productId: 3, retailerGs: 15, priceLocal: "£2.75" },
    { retailerId: 4, productId: 4, retailerGs: 15, priceLocal: "£2.25" },
    { retailerId: 4, productId: 9, retailerGs: 15, priceLocal: "£14.00" },
    { retailerId: 4, productId: 10, retailerGs: 15, priceLocal: "£3.80" },
    { retailerId: 4, productId: 12, retailerGs: 15, priceLocal: "£3.10" },
    // Woolworths (75% match) — 5 products
    { retailerId: 5, productId: 1, retailerGs: 8, priceLocal: "A$1.50" },
    { retailerId: 5, productId: 5, retailerGs: 15, priceLocal: "A$3.20" },
    { retailerId: 5, productId: 7, retailerGs: 14, priceLocal: "A$7.50" },
    { retailerId: 5, productId: 8, retailerGs: 11, priceLocal: "A$5.00" },
    { retailerId: 5, productId: 11, retailerGs: 12, priceLocal: "A$4.80" },
    // NTUC FairPrice (fixed 5) — 4 products
    { retailerId: 6, productId: 2, retailerGs: 5, priceLocal: "S$4.50" },
    { retailerId: 6, productId: 3, retailerGs: 5, priceLocal: "S$5.80" },
    { retailerId: 6, productId: 5, retailerGs: 5, priceLocal: "S$4.20" },
    { retailerId: 6, productId: 7, retailerGs: 5, priceLocal: "S$8.90" },
    // Carrefour (50% match) — 4 products
    { retailerId: 7, productId: 1, retailerGs: 5, priceLocal: "€0.95" },
    { retailerId: 7, productId: 4, retailerGs: 13, priceLocal: "€2.80" },
    { retailerId: 7, productId: 6, retailerGs: 6, priceLocal: "€5.20" },
    { retailerId: 7, productId: 12, retailerGs: 10, priceLocal: "€3.50" },
    // Whole Foods (fixed 8) — 3 products
    { retailerId: 8, productId: 4, retailerGs: 8, priceLocal: "$3.99" },
    { retailerId: 8, productId: 9, retailerGs: 8, priceLocal: "$18.99" },
    { retailerId: 8, productId: 10, retailerGs: 8, priceLocal: "$5.49" },
  ];

  const offerValues = offerInputs.map(o => {
    const retailer = retailerMap.get(o.retailerId);
    const product = productMap.get(o.productId);
    const baseGs = product?.baseGs || 0;
    const gsTotal = computeGsTotal(baseGs, o.retailerGs, retailer?.gsMatchPolicy ?? undefined, retailer?.gsMatchValue ?? undefined);
    return {
      retailerId: o.retailerId,
      productId: o.productId,
      retailerGs: o.retailerGs,
      gsMatchType: retailer?.gsMatchPolicy === "none" ? "fixed" : (retailer?.gsMatchPolicy || "fixed"),
      gsTotal,
      priceLocal: o.priceLocal,
      status: "active",
    };
  });
  const insertedOffers = await db.insert(retailerProducts).values(offerValues).returning();
  console.log(`  ✓ ${insertedOffers.length} retailer-product offers`);

  // ─── Countries ───
  const countryData = [
    { name: "European Union", flag: "🇪🇺", carbonReference: "EU ETS — €90/t", gsPrice: "€0.12/GS", floorPrice: "€0.08/GS", complianceFramework: "EU Green Deal / CBAM", readiness: 85, status: "active" },
    { name: "United Kingdom", flag: "🇬🇧", carbonReference: "UK ETS — £80/t", gsPrice: "£0.10/GS", floorPrice: "£0.07/GS", complianceFramework: "UK Carbon Border Adj.", readiness: 90, status: "active" },
    { name: "United States", flag: "🇺🇸", carbonReference: "RGGI — $15/t", gsPrice: "$0.08/GS", floorPrice: "$0.05/GS", complianceFramework: "IRA / EPA Clean Air", readiness: 60, status: "pending" },
    { name: "California", flag: "🇺🇸", carbonReference: "Cap-and-Trade — $35/t", gsPrice: "$0.11/GS", floorPrice: "$0.07/GS", complianceFramework: "AB 32 / CARB", readiness: 80, status: "active" },
    { name: "Australia", flag: "🇦🇺", carbonReference: "Safeguard — A$30/t", gsPrice: "A$0.09/GS", floorPrice: "A$0.06/GS", complianceFramework: "Safeguard Mechanism", readiness: 75, status: "active" },
    { name: "Singapore", flag: "🇸🇬", carbonReference: "Carbon Tax — S$25/t", gsPrice: "S$0.10/GS", floorPrice: "S$0.06/GS", complianceFramework: "Carbon Pricing Act", readiness: 70, status: "pending" },
    { name: "Switzerland", flag: "🇨🇭", carbonReference: "Swiss ETS — CHF 95/t", gsPrice: "CHF 0.14/GS", floorPrice: "CHF 0.09/GS", complianceFramework: "CO₂ Act", readiness: 88, status: "active" },
    { name: "Canada", flag: "🇨🇦", carbonReference: "Fed. Backstop — C$65/t", gsPrice: "C$0.10/GS", floorPrice: "C$0.07/GS", complianceFramework: "GGPPA", readiness: 78, status: "active" },
    { name: "Japan", flag: "🇯🇵", carbonReference: "GX League — ¥3,300/t", gsPrice: "¥15/GS", floorPrice: "¥10/GS", complianceFramework: "GX Promotion Act", readiness: 55, status: "planned" },
    { name: "South Korea", flag: "🇰🇷", carbonReference: "K-ETS — ₩20,000/t", gsPrice: "₩120/GS", floorPrice: "₩80/GS", complianceFramework: "K-ETS Act", readiness: 65, status: "planned" },
    { name: "New Zealand", flag: "🇳🇿", carbonReference: "NZ ETS — NZ$70/t", gsPrice: "NZ$0.11/GS", floorPrice: "NZ$0.07/GS", complianceFramework: "Climate Change Response Act", readiness: 82, status: "active" },
    { name: "China", flag: "🇨🇳", carbonReference: "National ETS — ¥70/t", gsPrice: "¥0.60/GS", floorPrice: "¥0.40/GS", complianceFramework: "Interim Regulations", readiness: 40, status: "planned" },
    { name: "Brazil", flag: "🇧🇷", carbonReference: "Proposed — R$50/t", gsPrice: "R$0.50/GS", floorPrice: "R$0.30/GS", complianceFramework: "PNMC", readiness: 30, status: "planned" },
    { name: "India", flag: "🇮🇳", carbonReference: "PAT Scheme — ₹200/t", gsPrice: "₹8/GS", floorPrice: "₹5/GS", complianceFramework: "Energy Conservation Act", readiness: 25, status: "planned" },
    { name: "Mexico", flag: "🇲🇽", carbonReference: "Carbon Tax — MX$50/t", gsPrice: "MX$1.50/GS", floorPrice: "MX$1.00/GS", complianceFramework: "LGCC", readiness: 35, status: "planned" },
  ];
  const insertedCountries = await db.insert(countries).values(countryData).returning();
  console.log(`  ✓ ${insertedCountries.length} countries`);

  // ─── Deals ───
  const dealData = [
    { name: "Tesco UK National", country: "UK", flag: "🇬🇧", volume: "5M GS/yr", price: "£0.004/GS", level: 3, score: 92, status: "active", type: "corporate", volumeTierId: 3, discountType: "percentage" as const, discountValue: 10, effectivePrice: 0.0036, cascadeFlagged: false, notes: "Flagship UK deal — 10% off national tier" },
    { name: "Woolworths AU Pilot", country: "AU", flag: "🇦🇺", volume: "1M GS/yr", price: "A$0.005/GS", level: 2, score: 78, status: "active", type: "pilot", volumeTierId: 2, discountType: "percentage" as const, discountValue: 15, effectivePrice: 0.00425, cascadeFlagged: false, notes: "Trial period — 15% pilot discount" },
    { name: "Carrefour EU Expansion", country: "EU/FR", flag: "🇫🇷", volume: "3M GS/yr", price: "€0.004/GS", level: 2, score: 85, status: "pending", type: "corporate", volumeTierId: 3, discountType: "percentage" as const, discountValue: 5, effectivePrice: 0.0038, cascadeFlagged: false, notes: "Pending board sign-off" },
    { name: "NTUC SG Entry", country: "SG", flag: "🇸🇬", volume: "500K GS/yr", price: "S$0.006/GS", level: 1, score: 60, status: "pending", type: "pilot", volumeTierId: 1, discountType: "percentage" as const, discountValue: 20, effectivePrice: 0.004, cascadeFlagged: false, notes: "Exploratory phase — early adopter discount" },
    { name: "Whole Foods US Launch", country: "US", flag: "🇺🇸", volume: "2M GS/yr", price: "$0.003/GS", level: 1, score: 55, status: "pending", type: "corporate", volumeTierId: 3, discountType: "fixed_override" as const, discountValue: 0.003, effectivePrice: 0.003, cascadeFlagged: false, notes: "Fixed rate negotiated for US launch" },
    { name: "Sainsbury's Green Range", country: "UK", flag: "🇬🇧", volume: "4M GS/yr", price: "£0.004/GS", level: 3, score: 88, status: "active", type: "corporate", volumeTierId: 3, discountType: "percentage" as const, discountValue: 8, effectivePrice: 0.00368, cascadeFlagged: false, notes: "Premium green product line — 8% partner discount" },
    { name: "Waitrose Premium Partner", country: "UK", flag: "🇬🇧", volume: "2M GS/yr", price: "£0.005/GS", level: 2, score: 80, status: "active", type: "premium", volumeTierId: 2, discountType: "percentage" as const, discountValue: 0, effectivePrice: 0.005, cascadeFlagged: false, notes: "Full rate — premium positioning" },
  ];
  const insertedDeals = await db.insert(deals).values(dealData).returning();
  console.log(`  ✓ ${insertedDeals.length} deals`);

  // ─── Volume Tiers ───
  const vtData = [
    { name: "Standard", threshold: "0 – 100K GS", pricePerGs: "£0.005/GS", priceNumeric: 0.005, basePriceAtSet: 0.005, discount: "0%", description: "Entry-level for small brands and trials" },
    { name: "Mid-Tier", threshold: "100K – 1M GS", pricePerGs: "£0.005/GS", priceNumeric: 0.005, basePriceAtSet: 0.005, discount: "0%", description: "Growth phase — most regional retailers" },
    { name: "Major", threshold: "1M – 10M GS", pricePerGs: "£0.004/GS", priceNumeric: 0.004, basePriceAtSet: 0.005, discount: "20%", description: "National retailer standard" },
    { name: "Enterprise", threshold: "10M+ GS", pricePerGs: "£0.003/GS", priceNumeric: 0.003, basePriceAtSet: 0.005, discount: "40%", description: "Multi-market enterprise agreements" },
  ];
  const insertedVT = await db.insert(volumeTiers).values(vtData).returning();
  console.log(`  ✓ ${insertedVT.length} volume tiers`);

  // ─── GS Pricing ───
  const gspData = [
    { tierName: "Base Rate", pricePerGs: "£0.005", priceNumeric: 0.005, volumeRange: "—", discountPct: "—", description: "Single source of truth — base price per GS for major retailers (voluntary credits)", isBasePrice: true },
    { tierName: "Standard Retail", pricePerGs: "£0.005", priceNumeric: 0.005, volumeRange: "0 – 100K", discountPct: "0%", description: "Entry-level retail pricing at base rate", isBasePrice: false },
    { tierName: "Growth Partner", pricePerGs: "£0.005", priceNumeric: 0.005, volumeRange: "100K – 500K", discountPct: "0%", description: "Growing brand — same rate, volume builds trust", isBasePrice: false },
    { tierName: "National Partner", pricePerGs: "£0.004", priceNumeric: 0.004, volumeRange: "500K – 5M", discountPct: "20%", description: "National-scale pricing for major retailers", isBasePrice: false },
    { tierName: "Enterprise", pricePerGs: "£0.003", priceNumeric: 0.003, volumeRange: "5M – 50M", discountPct: "40%", description: "Multi-market enterprise agreements", isBasePrice: false },
    { tierName: "Cause-Based Partner", pricePerGs: "£0.0025", priceNumeric: 0.0025, volumeRange: "Any", discountPct: "50%", description: "Non-profit / B-Corp / cause-led brands", isBasePrice: false },
  ];
  const insertedGSP = await db.insert(gsPricing).values(gspData).returning();
  console.log(`  ✓ ${insertedGSP.length} gs pricing tiers`);

  // ─── Equivalence ───
  const eqData = [
    { dimension: "Carbon", percentage: 32, gsValue: "3.2 GS per 1 tCO₂e", description: "Carbon offset equivalence — primary weight" },
    { dimension: "Biodiversity", percentage: 60, gsValue: "6.0 GS per biodiversity unit", description: "Biodiversity net gain — highest weight" },
    { dimension: "Animal Welfare", percentage: 3, gsValue: "0.3 GS per welfare unit", description: "Animal welfare standards compliance" },
    { dimension: "Water & Soil", percentage: 5, gsValue: "0.5 GS per water/soil unit", description: "Water stewardship and soil health" },
  ];
  const insertedEQ = await db.insert(equivalenceConfig).values(eqData).returning();
  console.log(`  ✓ ${insertedEQ.length} equivalence dimensions`);

  // ─── Value Protection ───
  const vpData = [
    { dimension: "Carbon Integrity", weight: 30, description: "Verified carbon credit quality and additionality" },
    { dimension: "Supply Chain Traceability", weight: 25, description: "End-to-end product provenance tracking" },
    { dimension: "Biodiversity Impact", weight: 20, description: "Measurable biodiversity net gain" },
    { dimension: "Social Value", weight: 10, description: "Community and workforce impact metrics" },
    { dimension: "Circular Economy", weight: 10, description: "Packaging recyclability and waste reduction" },
    { dimension: "Water Stewardship", weight: 5, description: "Water usage efficiency and watershed protection" },
  ];
  const insertedVP = await db.insert(valueProtection).values(vpData).returning();
  console.log(`  ✓ ${insertedVP.length} value protection dimensions`);

  // ─── Carbon Markets ───
  const cmData = [
    { name: "EU ETS", price: "€90.25", delta: "+2.4%", trendUp: true },
    { name: "UK ETS", price: "£78.50", delta: "+1.8%", trendUp: true },
    { name: "California CaT", price: "$35.10", delta: "-0.5%", trendUp: false },
    { name: "RGGI", price: "$15.20", delta: "+0.3%", trendUp: true },
    { name: "NZ ETS", price: "NZ$68.00", delta: "-1.2%", trendUp: false },
    { name: "K-ETS", price: "₩21,500", delta: "+3.1%", trendUp: true },
    { name: "China National ETS", price: "¥72.00", delta: "+1.5%", trendUp: true },
    { name: "Swiss ETS", price: "CHF 92.00", delta: "+2.0%", trendUp: true },
    { name: "Canada OBPS", price: "C$65.00", delta: "+0.8%", trendUp: true },
    { name: "Verra VCM (Vol.)", price: "$8.50", delta: "-4.2%", trendUp: false },
    { name: "Gold Standard (Vol.)", price: "$12.30", delta: "+1.0%", trendUp: true },
  ];
  const insertedCM = await db.insert(carbonMarkets).values(cmData).returning();
  console.log(`  ✓ ${insertedCM.length} carbon markets`);

  // ─── C2050 Streams ───
  const csData = [
    { stream: "IPCC AR6 Working Group Updates", frequency: "Quarterly", source: "IPCC", status: "live", lastUpdate: "2026-01-15" },
    { stream: "EU CBAM Implementation Tracker", frequency: "Monthly", source: "European Commission", status: "live", lastUpdate: "2026-02-28" },
    { stream: "Global Carbon Budget", frequency: "Annual", source: "Global Carbon Project", status: "live", lastUpdate: "2025-12-05" },
    { stream: "NDC Progress Dashboard", frequency: "Bi-annual", source: "UNFCCC", status: "live", lastUpdate: "2025-11-10" },
    { stream: "Corporate Net-Zero Tracker", frequency: "Monthly", source: "Net Zero Tracker / CA100+", status: "live", lastUpdate: "2026-03-01" },
    { stream: "Biodiversity Credit Standards", frequency: "Quarterly", source: "TNFD / Verra", status: "pending", lastUpdate: "2025-09-20" },
  ];
  const insertedCS = await db.insert(c2050Streams).values(csData).returning();
  console.log(`  ✓ ${insertedCS.length} c2050 streams`);

  // ─── Regulatory Updates ───
  const ruData = [
    { title: "EU CBAM Phase 2 — Full Carbon Pricing", jurisdiction: "EU", category: "carbon pricing", date: "2026-01-01", summary: "Full CBAM tariffs apply to imports of steel, cement, aluminium, fertiliser, electricity, and hydrogen.", impact: "high", status: "active" },
    { title: "UK Carbon Border Adjustment Mechanism", jurisdiction: "UK", category: "carbon pricing", date: "2027-01-01", summary: "UK CBAM consultation complete — implementation date set for 2027.", impact: "high", status: "active" },
    { title: "Australia Safeguard Mechanism Reform", jurisdiction: "AU", category: "emissions cap", date: "2025-07-01", summary: "Tighter baselines for top 215 emitters — 4.9% annual decline required.", impact: "medium", status: "active" },
    { title: "Singapore Carbon Tax Increase", jurisdiction: "SG", category: "carbon pricing", date: "2026-01-01", summary: "Carbon tax rises to S$25/tCO₂e, with trajectory to S$50-80 by 2030.", impact: "medium", status: "active" },
    { title: "California Advanced Clean Fleets Rule", jurisdiction: "US/CA", category: "transport", date: "2025-01-01", summary: "Zero-emission vehicle requirements for medium/heavy-duty fleets.", impact: "low", status: "active" },
  ];
  const insertedRU = await db.insert(regulatoryUpdates).values(ruData).returning();
  console.log(`  ✓ ${insertedRU.length} regulatory updates`);

  // ─── System Status ───
  const ssData = [
    { service: "GS Core API", status: "operational", uptime: "99.98%", notes: "" },
    { service: "Retailer Sync Engine", status: "operational", uptime: "99.95%", notes: "" },
    { service: "Carbon Data Pipeline", status: "operational", uptime: "99.90%", notes: "" },
    { service: "Equivalence Calculator", status: "operational", uptime: "99.99%", notes: "" },
    { service: "Payment Gateway", status: "operational", uptime: "99.97%", notes: "" },
    { service: "C2050 Data Feed", status: "degraded", uptime: "98.50%", notes: "Intermittent latency on biodiversity stream" },
    { service: "Notification Service", status: "operational", uptime: "99.92%", notes: "" },
    { service: "Compliance Checker", status: "operational", uptime: "99.88%", notes: "" },
  ];
  const insertedSS = await db.insert(systemStatus).values(ssData).returning();
  console.log(`  ✓ ${insertedSS.length} system status entries`);

  // ─── Change Log ───
  const clData = [
    { action: "created", section: "retailers", detail: "Added Tesco as active retailer with 100% GS match", userName: "admin" },
    { action: "created", section: "retailers", detail: "Added Sainsbury's with fixed 10 GS match policy", userName: "admin" },
    { action: "updated", section: "products", detail: "Verified Heinz Baked Beans — baseGs set to 10", userName: "admin" },
    { action: "created", section: "deals", detail: "Created Tesco UK National deal — 5M GS/yr", userName: "admin" },
    { action: "updated", section: "equivalence", detail: "Updated carbon equivalence to 32%", userName: "system" },
    { action: "created", section: "countries", detail: "Added 15 country configurations", userName: "system" },
    { action: "updated", section: "system", detail: "C2050 Data Feed status changed to degraded", userName: "system" },
  ];
  const insertedCL = await db.insert(changeLog).values(clData).returning();
  console.log(`  ✓ ${insertedCL.length} change log entries`);

  // ─── Approvals ───
  const apData = [
    { title: "Add NTUC FairPrice as active retailer", type: "retailer activation", submittedBy: "ops-team", detail: "Promote NTUC from pending to active status after SG trial", priority: "high", status: "pending" },
    { title: "Update Carrefour GS match to 75%", type: "pricing change", submittedBy: "commercial", detail: "Increase Carrefour GS match from 50% to 75% following contract renegotiation", priority: "normal", status: "pending" },
    { title: "Add Whole Foods US deal", type: "deal creation", submittedBy: "business-dev", detail: "New enterprise deal — 2M GS/yr at $0.07/GS", priority: "normal", status: "pending" },
  ];
  const insertedAP = await db.insert(approvalQueue).values(apData).returning();
  console.log(`  ✓ ${insertedAP.length} approval queue entries`);

  // ═══════════════════════════════════════════════════
  //  DEFAULT ADMIN USER
  // ═══════════════════════════════════════════════════
  console.log("\nseeding default admin user...");
  const salt = await bcrypt.genSalt(12);
  const defaultPassword = await bcrypt.hash("McpAdmin2026!", salt);
  const insertedUsers = await db.insert(users).values([
    {
      username: "admin",
      passwordHash: defaultPassword,
      displayName: "mcp administrator",
      role: "super_admin",
      active: true,
      mustChangePassword: true,
    },
  ]).onConflictDoNothing().returning();
  console.log(`  ✓ ${insertedUsers.length} users (default: admin / McpAdmin2026!)`);

  console.log("\n✅ database seeded successfully!");
  console.log(`   total records: ${
    insertedRetailers.length + insertedProducts.length + insertedOffers.length +
    insertedCountries.length + insertedDeals.length + insertedVT.length +
    insertedGSP.length + insertedEQ.length + insertedVP.length +
    insertedCM.length + insertedCS.length + insertedRU.length +
    insertedSS.length + insertedCL.length + insertedAP.length +
    insertedUsers.length
  }`);

  await pool.end();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
