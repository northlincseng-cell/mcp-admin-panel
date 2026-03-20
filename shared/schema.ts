import { pgTable, text, serial, integer, boolean, real, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ═══════════════════════════════════════════════════
//  USERS & AUTHENTICATION
//  Roles: super_admin > admin > analyst > api_client > viewer
//  No PII stored — usernames only, no email/phone
// ═══════════════════════════════════════════════════

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("viewer"),  // super_admin | admin | analyst | api_client | viewer
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_users_username").on(table.username),
]);


// ═══════════════════════════════════════════════════
//  RETAILERS & PRODUCTS — Core commercial model
//  Efficient: composite indexes on frequently joined columns,
//  denormalised gs_total on offers to avoid runtime sums
// ═══════════════════════════════════════════════════

export const retailers = pgTable("retailers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull(),       // e.g. "SAINS", "TESCO"
  country: text("country").notNull().default("UK"),
  flag: text("flag").default("🇬🇧"),
  status: text("status").notNull().default("active"),     // active | pending | inactive
  gsMatchPolicy: text("gs_match_policy").default("none"), // none | fixed | percentage
  gsMatchValue: real("gs_match_value").default(0),        // fixed GS amount or % multiplier
  contactEmail: text("contact_email").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 40 }).notNull(),
  brand: text("brand").notNull(),                        // e.g. "Heinz"
  category: text("category").notNull().default("grocery"),
  baseGs: integer("base_gs").notNull().default(0),       // manufacturer's base GS per unit
  carbonPct: real("carbon_pct").default(10),             // % of GS value from carbon (min 10%)
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("active"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_products_brand").on(table.brand),
  index("idx_products_category").on(table.category),
]);

// Junction table: which retailers stock which products, with per-retailer GS config
export const retailerProducts = pgTable("retailer_products", {
  id: serial("id").primaryKey(),
  retailerId: integer("retailer_id").notNull(),
  productId: integer("product_id").notNull(),
  retailerGs: integer("retailer_gs").default(0),          // retailer's GS top-up
  gsMatchType: text("gs_match_type").default("fixed"),    // fixed | percentage | match
  gsTotal: integer("gs_total").default(0),                // denormalised: base_gs + retailer_gs (computed on write)
  priceLocal: text("price_local").default(""),            // shelf price in local currency
  status: text("status").notNull().default("active"),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_rp_unique").on(table.retailerId, table.productId),
  index("idx_rp_retailer").on(table.retailerId),
  index("idx_rp_product").on(table.productId),
]);


// ═══════════════════════════════════════════════════
//  COUNTRY DEFAULTS — Jurisdiction pricing & compliance
// ═══════════════════════════════════════════════════

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  flag: text("flag").default(""),
  carbonReference: text("carbon_reference").default(""),
  gsPrice: text("gs_price").default(""),
  floorPrice: text("floor_price").default(""),
  complianceFramework: text("compliance_framework").default(""),
  readiness: integer("readiness").default(0),
  status: text("status").notNull().default("planned"),   // active | pending | planned
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  CORPORATE DEALS
// ═══════════════════════════════════════════════════

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").default(""),
  flag: text("flag").default(""),
  volume: text("volume").default(""),
  price: text("price").default(""),                              // legacy display price (kept for backward compat)
  level: integer("level").default(1),
  score: integer("score").default(0),
  status: text("status").notNull().default("pending"),
  type: text("type").default("corporate"),
  // ─── Cascade pricing fields ───
  volumeTierId: integer("volume_tier_id"),                       // which volume tier this deal is linked to
  discountType: text("discount_type").default("percentage"),     // percentage | fixed_override
  discountValue: real("discount_value").default(0),              // % off tier price, OR the fixed override price
  effectivePrice: real("effective_price").default(0),            // computed: tier price after discount/override
  cascadeFlagged: boolean("cascade_flagged").default(false),     // flagged for review after base price change
  cascadeFlaggedAt: timestamp("cascade_flagged_at"),             // when it was flagged
  // ─── end cascade fields ───
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  VOLUME TIERS & GS PRICING
// ═══════════════════════════════════════════════════

export const volumeTiers = pgTable("volume_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  threshold: text("threshold").default(""),
  pricePerGs: text("price_per_gs").default(""),
  priceNumeric: real("price_numeric").default(0),               // actual numeric price per GS in £
  basePriceAtSet: real("base_price_at_set").default(0),         // what the base price was when admin last set this tier's price
  discount: text("discount").default(""),
  description: text("description").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gsPricing = pgTable("gs_pricing", {
  id: serial("id").primaryKey(),
  tierName: text("tier_name").notNull(),
  pricePerGs: text("price_per_gs").default(""),
  priceNumeric: real("price_numeric").default(0),               // numeric price per GS in £ — source of truth
  volumeRange: text("volume_range").default(""),
  discountPct: text("discount_pct").default(""),
  description: text("description").default(""),
  isBasePrice: boolean("is_base_price").default(false),         // marks the tier that is the base price (single source of truth)
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  EQUIVALENCE ENGINE
// ═══════════════════════════════════════════════════

export const equivalenceConfig = pgTable("equivalence_config", {
  id: serial("id").primaryKey(),
  dimension: text("dimension").notNull(),
  percentage: real("percentage").default(0),
  gsValue: text("gs_value").default(""),
  description: text("description").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  VALUE PROTECTION
// ═══════════════════════════════════════════════════

export const valueProtection = pgTable("value_protection", {
  id: serial("id").primaryKey(),
  dimension: text("dimension").notNull(),
  weight: integer("weight").default(0),
  description: text("description").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  CARBON MARKETS
// ═══════════════════════════════════════════════════

export const carbonMarkets = pgTable("carbon_markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").default(""),
  delta: text("delta").default(""),
  trendUp: boolean("trend_up").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  C2050 DATA STREAMS
// ═══════════════════════════════════════════════════

export const c2050Streams = pgTable("c2050_streams", {
  id: serial("id").primaryKey(),
  stream: text("stream").notNull(),
  frequency: text("frequency").default(""),
  source: text("source").default(""),
  status: text("status").default("live"),
  lastUpdate: text("last_update").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  REGULATORY UPDATES
// ═══════════════════════════════════════════════════

export const regulatoryUpdates = pgTable("regulatory_updates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  jurisdiction: text("jurisdiction").default(""),
  category: text("category").default(""),
  date: text("date").default(""),
  summary: text("summary").default(""),
  impact: text("impact").default("medium"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ═══════════════════════════════════════════════════
//  SYSTEM STATUS
// ═══════════════════════════════════════════════════

export const systemStatus = pgTable("system_status", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").default("operational"),
  uptime: text("uptime").default("99.9%"),
  lastChecked: timestamp("last_checked").defaultNow(),
  notes: text("notes").default(""),
});


// ═══════════════════════════════════════════════════
//  AUDIT: CHANGE LOG & APPROVAL QUEUE
// ═══════════════════════════════════════════════════

export const changeLog = pgTable("change_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  section: text("section").default(""),
  detail: text("detail").default(""),
  userName: text("user_name").default("system"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_changelog_created").on(table.createdAt),
]);

export const approvalQueue = pgTable("approval_queue", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").default(""),
  submittedBy: text("submitted_by").default(""),
  detail: text("detail").default(""),
  priority: text("priority").default("normal"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});


// ═══════════════════════════════════════════════════
//  INSERT SCHEMAS & TYPES
// ═══════════════════════════════════════════════════

// Retailers
export const insertRetailerSchema = createInsertSchema(retailers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRetailer = z.infer<typeof insertRetailerSchema>;
export type Retailer = typeof retailers.$inferSelect;

// Products
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Retailer-Product offers
export const insertRetailerProductSchema = createInsertSchema(retailerProducts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRetailerProduct = z.infer<typeof insertRetailerProductSchema>;
export type RetailerProduct = typeof retailerProducts.$inferSelect;

// Countries
export const insertCountrySchema = createInsertSchema(countries).omit({ id: true, updatedAt: true });
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

// Deals
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// Volume Tiers
export const insertVolumeTierSchema = createInsertSchema(volumeTiers).omit({ id: true, updatedAt: true });
export type InsertVolumeTier = z.infer<typeof insertVolumeTierSchema>;
export type VolumeTier = typeof volumeTiers.$inferSelect;

// GS Pricing
export const insertGsPricingSchema = createInsertSchema(gsPricing).omit({ id: true, updatedAt: true });
export type InsertGsPricing = z.infer<typeof insertGsPricingSchema>;
export type GsPricing = typeof gsPricing.$inferSelect;

// Equivalence
export const insertEquivalenceSchema = createInsertSchema(equivalenceConfig).omit({ id: true, updatedAt: true });
export type InsertEquivalence = z.infer<typeof insertEquivalenceSchema>;
export type Equivalence = typeof equivalenceConfig.$inferSelect;

// Value Protection
export const insertValueProtectionSchema = createInsertSchema(valueProtection).omit({ id: true, updatedAt: true });
export type InsertValueProtection = z.infer<typeof insertValueProtectionSchema>;
export type ValueProtection = typeof valueProtection.$inferSelect;

// Carbon Markets
export const insertCarbonMarketSchema = createInsertSchema(carbonMarkets).omit({ id: true, updatedAt: true });
export type InsertCarbonMarket = z.infer<typeof insertCarbonMarketSchema>;
export type CarbonMarket = typeof carbonMarkets.$inferSelect;

// C2050 Streams
export const insertC2050StreamSchema = createInsertSchema(c2050Streams).omit({ id: true, updatedAt: true });
export type InsertC2050Stream = z.infer<typeof insertC2050StreamSchema>;
export type C2050Stream = typeof c2050Streams.$inferSelect;

// Regulatory Updates
export const insertRegulatoryUpdateSchema = createInsertSchema(regulatoryUpdates).omit({ id: true, createdAt: true });
export type InsertRegulatoryUpdate = z.infer<typeof insertRegulatoryUpdateSchema>;
export type RegulatoryUpdate = typeof regulatoryUpdates.$inferSelect;

// System Status
export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({ id: true, lastChecked: true });
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;

// Change Log
export const insertChangeLogSchema = createInsertSchema(changeLog).omit({ id: true, createdAt: true });
export type InsertChangeLog = z.infer<typeof insertChangeLogSchema>;
export type ChangeLogEntry = typeof changeLog.$inferSelect;

// Approval Queue
export const insertApprovalSchema = createInsertSchema(approvalQueue).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvalQueue.$inferSelect;

// Users
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Role hierarchy (higher index = more privilege)
export const ROLE_HIERARCHY = ["viewer", "api_client", "analyst", "admin", "super_admin"] as const;
export type UserRole = typeof ROLE_HIERARCHY[number];

/** Check if roleA has at least the privilege of roleB */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole as UserRole);
  const reqIdx = ROLE_HIERARCHY.indexOf(requiredRole as UserRole);
  return userIdx >= reqIdx;
}

// Login schema for validation
export const loginSchema = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "current password is required"),
  newPassword: z.string().min(8, "password must be at least 8 characters"),
});
