import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth";
import {
  insertRetailerSchema,
  insertProductSchema,
  insertRetailerProductSchema,
  insertCountrySchema,
  insertDealSchema,
  insertVolumeTierSchema,
  insertGsPricingSchema,
  insertEquivalenceSchema,
  insertValueProtectionSchema,
  insertCarbonMarketSchema,
  insertC2050StreamSchema,
  insertRegulatoryUpdateSchema,
  insertSystemStatusSchema,
  insertApprovalSchema,
  hasRole,
  users,
  ROLE_HIERARCHY,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

/** Strip HTML tags from all string values in an object */
function sanitize<T>(obj: T): T {
  if (typeof obj === "string") {
    return obj.replace(/<[^>]*>/g, "") as unknown as T;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitize) as unknown as T;
  }
  return obj;
}

/** Parse numeric id from route params */
function parseId(req: Request): number | null {
  const raw = req.params.id;
  const id = parseInt(typeof raw === "string" ? raw : String(raw), 10);
  return isNaN(id) ? null : id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ═══════════════════════════════════════════════════
  //  SECURITY MIDDLEWARE
  // ═══════════════════════════════════════════════════

  // Rate limiting: simple in-memory counter
  const rateLimiter = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimiter.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimiter.set(ip, { count: 1, resetAt: now + 60000 });
      return next();
    }
    entry.count++;
    if (entry.count > 100) { // 100 req/min
      return res.status(429).json({ error: 'rate limit exceeded' });
    }
    next();
  });

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ═══════════════════════════════════════════════════
  //  RBAC GUARDS
  //  - All /api routes (except /api/auth/*) require login
  //  - GET = viewer+ (read access)
  //  - POST/PUT/DELETE = admin+ (write access)
  // ═══════════════════════════════════════════════════

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Auth routes are public
    if (req.path.startsWith('/auth/')) return next();

    // Everything else requires login
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'authentication required' });
    }

    // Write operations require admin role
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!hasRole(req.user!.role, 'admin')) {
        return res.status(403).json({ error: 'admin access required for write operations' });
      }
    }

    next();
  });

  // ═══════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════

  app.get("/api/dashboard", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  RETAILERS
  // ═══════════════════════════════════════════════════

  app.get("/api/retailers", async (_req: Request, res: Response) => {
    try {
      const retailers = await storage.listRetailers();
      res.json(retailers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/retailers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const retailer = await storage.getRetailer(id);
      if (!retailer) return res.status(404).json({ error: "retailer not found" });
      res.json(retailer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/retailers", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertRetailerSchema.parse(body);
      const retailer = await storage.createRetailer(parsed);
      await storage.logChange("created", "retailers", `created retailer: ${retailer.name}`, req.user?.username || "system");
      res.status(201).json(retailer);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/retailers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertRetailerSchema.partial().parse(body);
      const retailer = await storage.updateRetailer(id, parsed);
      if (!retailer) return res.status(404).json({ error: "retailer not found" });
      await storage.logChange("updated", "retailers", `updated retailer: ${retailer.name}`, req.user?.username || "system");
      res.json(retailer);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/retailers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getRetailer(id);
      if (!existing) return res.status(404).json({ error: "retailer not found" });
      await storage.deleteRetailer(id);
      await storage.logChange("deleted", "retailers", `deleted retailer: ${existing.name}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/retailers/:id/products", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const retailer = await storage.getRetailer(id);
      if (!retailer) return res.status(404).json({ error: "retailer not found" });
      const products = await storage.getRetailerProducts(id);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  PRODUCTS
  // ═══════════════════════════════════════════════════

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const brand = req.query.brand as string | undefined;
      const products = await storage.listProducts(brand ? { brand } : undefined);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ error: "product not found" });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertProductSchema.parse(body);
      const product = await storage.createProduct(parsed);
      await storage.logChange("created", "products", `created product: ${product.name}`, req.user?.username || "system");
      res.status(201).json(product);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertProductSchema.partial().parse(body);
      const product = await storage.updateProduct(id, parsed);
      if (!product) return res.status(404).json({ error: "product not found" });
      await storage.logChange("updated", "products", `updated product: ${product.name}`, req.user?.username || "system");
      res.json(product);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ error: "product not found" });
      await storage.deleteProduct(id);
      await storage.logChange("deleted", "products", `deleted product: ${existing.name}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/products/:id/retailers", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ error: "product not found" });
      const retailers = await storage.getProductRetailers(id);
      res.json(retailers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  RETAILER-PRODUCT OFFERS
  // ═══════════════════════════════════════════════════

  app.get("/api/offers", async (_req: Request, res: Response) => {
    try {
      const offers = await storage.listRetailerProducts();
      res.json(offers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/offers", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertRetailerProductSchema.parse(body);
      const offer = await storage.createRetailerProduct(parsed);
      const retailer = await storage.getRetailer(offer.retailerId);
      const product = await storage.getProduct(offer.productId);
      await storage.logChange("created", "offers", `created offer: ${retailer?.name || offer.retailerId} × ${product?.name || offer.productId} (gs total: ${offer.gsTotal})`, "api");
      res.status(201).json(offer);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/offers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertRetailerProductSchema.partial().parse(body);
      const offer = await storage.updateRetailerProduct(id, parsed);
      if (!offer) return res.status(404).json({ error: "offer not found" });
      await storage.logChange("updated", "offers", `updated offer id ${id} (gs total: ${offer.gsTotal})`, "api");
      res.json(offer);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/offers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getRetailerProduct(id);
      if (!existing) return res.status(404).json({ error: "offer not found" });
      await storage.deleteRetailerProduct(id);
      await storage.logChange("deleted", "offers", `deleted offer id ${id}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  COUNTRIES
  // ═══════════════════════════════════════════════════

  app.get("/api/countries", async (_req: Request, res: Response) => {
    try {
      const countries = await storage.listCountries();
      res.json(countries);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/countries", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertCountrySchema.parse(body);
      const country = await storage.createCountry(parsed);
      await storage.logChange("created", "countries", `created country: ${country.name}`, req.user?.username || "system");
      res.status(201).json(country);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/countries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertCountrySchema.partial().parse(body);
      const country = await storage.updateCountry(id, parsed);
      if (!country) return res.status(404).json({ error: "country not found" });
      await storage.logChange("updated", "countries", `updated country: ${country.name}`, req.user?.username || "system");
      res.json(country);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/countries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getCountry(id);
      if (!existing) return res.status(404).json({ error: "country not found" });
      await storage.deleteCountry(id);
      await storage.logChange("deleted", "countries", `deleted country: ${existing.name}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  DEALS
  // ═══════════════════════════════════════════════════

  app.get("/api/deals", async (_req: Request, res: Response) => {
    try {
      const deals = await storage.listDeals();
      res.json(deals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/deals/flagged", async (_req: Request, res: Response) => {
    try {
      const deals = await storage.listFlaggedDeals();
      res.json(deals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/deals/:id/acknowledge", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const deal = await storage.acknowledgeDealCascade(id, req.user?.username || "system");
      if (!deal) return res.status(404).json({ error: "deal not found" });
      await storage.logChange("acknowledged", "deals", `acknowledged cascade flag on deal: ${deal.name}`, req.user?.username || "system");
      res.json(deal);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/deals", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertDealSchema.parse(body);
      const deal = await storage.createDeal(parsed);
      await storage.logChange("created", "deals", `created deal: ${deal.name}`, req.user?.username || "system");
      res.status(201).json(deal);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/deals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertDealSchema.partial().parse(body);
      const deal = await storage.updateDeal(id, parsed);
      if (!deal) return res.status(404).json({ error: "deal not found" });
      await storage.logChange("updated", "deals", `updated deal: ${deal.name}`, req.user?.username || "system");
      res.json(deal);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/deals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getDeal(id);
      if (!existing) return res.status(404).json({ error: "deal not found" });
      await storage.deleteDeal(id);
      await storage.logChange("deleted", "deals", `deleted deal: ${existing.name}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  VOLUME TIERS
  // ═══════════════════════════════════════════════════

  app.get("/api/tiers", async (_req: Request, res: Response) => {
    try {
      const tiers = await storage.listVolumeTiers();
      res.json(tiers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/tiers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertVolumeTierSchema.partial().parse(body);
      const tier = await storage.updateVolumeTier(id, parsed);
      if (!tier) return res.status(404).json({ error: "volume tier not found" });
      await storage.logChange("updated", "volume-tiers", `updated tier: ${tier.name}`, req.user?.username || "system");
      res.json(tier);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  GS PRICING
  // ═══════════════════════════════════════════════════

  app.get("/api/pricing", async (_req: Request, res: Response) => {
    try {
      const pricing = await storage.listGsPricing();
      res.json(pricing);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/pricing/base", async (_req: Request, res: Response) => {
    try {
      const base = await storage.getBasePrice();
      if (!base) return res.status(404).json({ error: "no base price configured" });
      res.json(base);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/pricing/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertGsPricingSchema.partial().parse(body);
      const pricing = await storage.updateGsPricing(id, parsed);
      if (!pricing) return res.status(404).json({ error: "pricing tier not found" });
      await storage.logChange("updated", "gs-pricing", `updated pricing tier: ${pricing.tierName}`, req.user?.username || "system");
      res.json(pricing);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // CASCADE: Update base price and recalculate all downstream prices
  app.post("/api/pricing/cascade", async (req: Request, res: Response) => {
    try {
      const { basePriceId, newPriceNumeric } = req.body as { basePriceId: number; newPriceNumeric: number };
      if (!basePriceId || newPriceNumeric === undefined || newPriceNumeric <= 0) {
        return res.status(400).json({ error: "basePriceId and newPriceNumeric (> 0) are required" });
      }
      const result = await storage.updateBasePriceAndCascade(
        basePriceId,
        newPriceNumeric,
        req.user?.username || "system"
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  EQUIVALENCE
  // ═══════════════════════════════════════════════════

  app.get("/api/equivalence", async (_req: Request, res: Response) => {
    try {
      const eq = await storage.listEquivalence();
      res.json(eq);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/equivalence/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertEquivalenceSchema.partial().parse(body);
      const eq = await storage.updateEquivalence(id, parsed);
      if (!eq) return res.status(404).json({ error: "equivalence config not found" });
      await storage.logChange("updated", "equivalence", `updated dimension: ${eq.dimension}`, req.user?.username || "system");
      res.json(eq);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  VALUE PROTECTION
  // ═══════════════════════════════════════════════════

  app.get("/api/value-protection", async (_req: Request, res: Response) => {
    try {
      const vp = await storage.listValueProtection();
      res.json(vp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/value-protection/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertValueProtectionSchema.partial().parse(body);
      const vp = await storage.updateValueProtection(id, parsed);
      if (!vp) return res.status(404).json({ error: "value protection dimension not found" });
      await storage.logChange("updated", "value-protection", `updated dimension: ${vp.dimension}`, req.user?.username || "system");
      res.json(vp);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  CARBON MARKETS
  // ═══════════════════════════════════════════════════

  app.get("/api/markets", async (_req: Request, res: Response) => {
    try {
      const markets = await storage.listCarbonMarkets();
      res.json(markets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/markets", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertCarbonMarketSchema.parse(body);
      const market = await storage.createCarbonMarket(parsed);
      await storage.logChange("created", "carbon-markets", `created market: ${market.name}`, req.user?.username || "system");
      res.status(201).json(market);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/markets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertCarbonMarketSchema.partial().parse(body);
      const market = await storage.updateCarbonMarket(id, parsed);
      if (!market) return res.status(404).json({ error: "carbon market not found" });
      await storage.logChange("updated", "carbon-markets", `updated market: ${market.name}`, req.user?.username || "system");
      res.json(market);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/markets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getCarbonMarket(id);
      if (!existing) return res.status(404).json({ error: "carbon market not found" });
      await storage.deleteCarbonMarket(id);
      await storage.logChange("deleted", "carbon-markets", `deleted market: ${existing.name}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  C2050 STREAMS
  // ═══════════════════════════════════════════════════

  app.get("/api/streams", async (_req: Request, res: Response) => {
    try {
      const streams = await storage.listC2050Streams();
      res.json(streams);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/streams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertC2050StreamSchema.partial().parse(body);
      const stream = await storage.updateC2050Stream(id, parsed);
      if (!stream) return res.status(404).json({ error: "c2050 stream not found" });
      await storage.logChange("updated", "c2050-streams", `updated stream: ${stream.stream}`, req.user?.username || "system");
      res.json(stream);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  REGULATORY UPDATES
  // ═══════════════════════════════════════════════════

  app.get("/api/regulatory", async (_req: Request, res: Response) => {
    try {
      const updates = await storage.listRegulatoryUpdates();
      res.json(updates);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/regulatory", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertRegulatoryUpdateSchema.parse(body);
      const update = await storage.createRegulatoryUpdate(parsed);
      await storage.logChange("created", "regulatory", `created regulatory update: ${update.title}`, req.user?.username || "system");
      res.status(201).json(update);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/regulatory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertRegulatoryUpdateSchema.partial().parse(body);
      const update = await storage.updateRegulatoryUpdate(id, parsed);
      if (!update) return res.status(404).json({ error: "regulatory update not found" });
      await storage.logChange("updated", "regulatory", `updated regulatory: ${update.title}`, req.user?.username || "system");
      res.json(update);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/regulatory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getRegulatoryUpdate(id);
      if (!existing) return res.status(404).json({ error: "regulatory update not found" });
      await storage.deleteRegulatoryUpdate(id);
      await storage.logChange("deleted", "regulatory", `deleted regulatory: ${existing.title}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  SYSTEM STATUS
  // ═══════════════════════════════════════════════════

  app.get("/api/system-status", async (_req: Request, res: Response) => {
    try {
      const status = await storage.listSystemStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/system-status/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const body = sanitize(req.body);
      const parsed = insertSystemStatusSchema.partial().parse(body);
      const status = await storage.updateSystemStatus(id, parsed);
      if (!status) return res.status(404).json({ error: "system status not found" });
      await storage.logChange("updated", "system-status", `updated service: ${status.service} → ${status.status}`, req.user?.username || "system");
      res.json(status);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  CHANGE LOG
  // ═══════════════════════════════════════════════════

  app.get("/api/changelog", async (_req: Request, res: Response) => {
    try {
      const log = await storage.listChangeLog(50);
      res.json(log);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  APPROVALS
  // ═══════════════════════════════════════════════════

  app.get("/api/approvals", async (_req: Request, res: Response) => {
    try {
      const approvals = await storage.listApprovals();
      res.json(approvals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/approvals", async (req: Request, res: Response) => {
    try {
      const body = sanitize(req.body);
      const parsed = insertApprovalSchema.parse(body);
      const approval = await storage.createApproval(parsed);
      await storage.logChange("created", "approvals", `created approval request: ${approval.title}`, req.user?.username || "system");
      res.status(201).json(approval);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/approvals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const existing = await storage.getApproval(id);
      if (!existing) return res.status(404).json({ error: "approval not found" });

      const { action } = req.body as { action?: string };
      if (action === "approve" || action === "reject") {
        const status = action === "approve" ? "approved" : "rejected";
        const updated = await storage.updateApproval(id, {
          status,
          resolvedAt: new Date(),
          resolvedBy: req.user?.username || "system",
        });
        await storage.logChange(action === "approve" ? "approved" : "rejected", "approvals", `${status} approval: ${existing.title}`, req.user?.username || "system");
        return res.json(updated);
      }

      // Generic partial update
      const body = sanitize(req.body);
      const parsed = insertApprovalSchema.partial().parse(body);
      const updated = await storage.updateApproval(id, parsed);
      if (!updated) return res.status(404).json({ error: "approval not found" });
      await storage.logChange("updated", "approvals", `updated approval: ${updated.title}`, req.user?.username || "system");
      res.json(updated);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "validation failed", details: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  //  USER MANAGEMENT (super_admin only for mutations)
  // ═══════════════════════════════════════════════════

  app.get("/api/users", requireAuth, async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        active: users.active,
        mustChangePassword: users.mustChangePassword,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      }).from(users);
      res.json(allUsers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users", requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const { username, displayName, role, password } = req.body;
      if (!username || !displayName || !role || !password) {
        return res.status(400).json({ error: "username, displayName, role, and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "password must be at least 8 characters" });
      }
      if (!ROLE_HIERARCHY.includes(role)) {
        return res.status(400).json({ error: "invalid role" });
      }

      const db = getDb();
      const existing = await db.select().from(users).where(eq(users.username, username.toLowerCase().trim())).limit(1);
      if (existing.length) {
        return res.status(409).json({ error: "username already exists" });
      }

      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);
      const [newUser] = await db.insert(users).values({
        username: username.toLowerCase().trim(),
        displayName,
        role,
        passwordHash: hash,
        mustChangePassword: true,
        active: true,
      }).returning();

      await storage.logChange("created", "users", `created user: ${newUser.username} (${role})`, req.user?.username || "system");
      const { passwordHash, ...safe } = newUser;
      res.status(201).json(safe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/users/:id", requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const { displayName, role, active } = req.body;
      const db = getDb();

      const updates: any = { updatedAt: new Date() };
      if (displayName !== undefined) updates.displayName = displayName;
      if (role !== undefined) {
        if (!ROLE_HIERARCHY.includes(role)) {
          return res.status(400).json({ error: "invalid role" });
        }
        updates.role = role;
      }
      if (active !== undefined) updates.active = active;

      const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "user not found" });

      await storage.logChange("updated", "users", `updated user: ${updated.username}`, req.user?.username || "system");
      const { passwordHash, ...safe } = updated;
      res.json(safe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/:id/reset-password", requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const id = parseId(req);
      if (!id) return res.status(400).json({ error: "invalid id" });
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "password must be at least 8 characters" });
      }

      const db = getDb();
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);
      const [updated] = await db.update(users).set({
        passwordHash: hash,
        mustChangePassword: true,
        updatedAt: new Date(),
      }).where(eq(users.id, id)).returning();

      if (!updated) return res.status(404).json({ error: "user not found" });

      await storage.logChange("reset-password", "users", `reset password for user: ${updated.username}`, req.user?.username || "system");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
