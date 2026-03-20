import { eq, desc, sql, and, ilike } from "drizzle-orm";
import { getDb } from "./db";
import {
  retailers, products, retailerProducts, countries, deals,
  volumeTiers, gsPricing, equivalenceConfig, valueProtection,
  carbonMarkets, c2050Streams, regulatoryUpdates, systemStatus,
  changeLog, approvalQueue,
} from "@shared/schema";
import type {
  Retailer, InsertRetailer,
  Product, InsertProduct,
  RetailerProduct, InsertRetailerProduct,
  Country, InsertCountry,
  Deal, InsertDeal,
  VolumeTier, InsertVolumeTier,
  GsPricing, InsertGsPricing,
  Equivalence, InsertEquivalence,
  ValueProtection, InsertValueProtection,
  CarbonMarket, InsertCarbonMarket,
  C2050Stream, InsertC2050Stream,
  RegulatoryUpdate, InsertRegulatoryUpdate,
  SystemStatus, InsertSystemStatus,
  ChangeLogEntry, InsertChangeLog,
  Approval, InsertApproval,
} from "@shared/schema";
import type { IStorage } from "./storage";

// ═══════════════════════════════════════════════════
//  POSTGRES DATABASE STORAGE
//  All queries via Drizzle ORM — typed and efficient
// ═══════════════════════════════════════════════════

export class DatabaseStorage implements IStorage {

  // ═══════ COMPUTE GS TOTAL ═══════
  private computeGsTotal(baseGs: number, retailerGs: number, retailer?: Retailer): number {
    if (!retailer) return baseGs + retailerGs;
    if (retailer.gsMatchPolicy === "percentage") {
      const matchAmount = Math.round(baseGs * (retailer.gsMatchValue || 0) / 100);
      return baseGs + matchAmount;
    }
    if (retailer.gsMatchPolicy === "fixed") {
      return baseGs + (retailer.gsMatchValue || 0);
    }
    return baseGs + retailerGs;
  }

  // ─── Retailers ───────────────────────────────────

  async listRetailers(): Promise<Retailer[]> {
    return getDb().select().from(retailers);
  }

  async getRetailer(id: number): Promise<Retailer | undefined> {
    const [row] = await getDb().select().from(retailers).where(eq(retailers.id, id)).limit(1);
    return row;
  }

  async createRetailer(data: InsertRetailer): Promise<Retailer> {
    const [row] = await getDb().insert(retailers).values(data).returning();
    return row;
  }

  async updateRetailer(id: number, data: Partial<InsertRetailer>): Promise<Retailer | undefined> {
    const [row] = await getDb().update(retailers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(retailers.id, id))
      .returning();
    if (!row) return undefined;
    // Recompute gsTotal for all offers of this retailer when match policy changes
    if (data.gsMatchPolicy !== undefined || data.gsMatchValue !== undefined) {
      await this.recomputeRetailerOffers(id);
    }
    return row;
  }

  async deleteRetailer(id: number): Promise<boolean> {
    const result = await getDb().delete(retailers).where(eq(retailers.id, id)).returning();
    return result.length > 0;
  }

  private async recomputeRetailerOffers(retailerId: number): Promise<void> {
    const retailer = await this.getRetailer(retailerId);
    if (!retailer) return;
    const offers = await getDb().select().from(retailerProducts).where(eq(retailerProducts.retailerId, retailerId));
    for (const rp of offers) {
      const product = await this.getProduct(rp.productId);
      const baseGs = product?.baseGs || 0;
      const newTotal = this.computeGsTotal(baseGs, rp.retailerGs || 0, retailer);
      await getDb().update(retailerProducts)
        .set({ gsTotal: newTotal, updatedAt: new Date() })
        .where(eq(retailerProducts.id, rp.id));
    }
  }

  // ─── Products ────────────────────────────────────

  async listProducts(filters?: { brand?: string }): Promise<Product[]> {
    if (filters?.brand) {
      return getDb().select().from(products).where(ilike(products.brand, filters.brand));
    }
    return getDb().select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [row] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
    return row;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [row] = await getDb().insert(products).values(data).returning();
    return row;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [row] = await getDb().update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!row) return undefined;
    // Recompute gsTotal for all offers of this product when baseGs changes
    if (data.baseGs !== undefined) {
      await this.recomputeProductOffers(id);
    }
    return row;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await getDb().delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  private async recomputeProductOffers(productId: number): Promise<void> {
    const product = await this.getProduct(productId);
    const baseGs = product?.baseGs || 0;
    const offers = await getDb().select().from(retailerProducts).where(eq(retailerProducts.productId, productId));
    for (const rp of offers) {
      const retailer = await this.getRetailer(rp.retailerId);
      const newTotal = this.computeGsTotal(baseGs, rp.retailerGs || 0, retailer);
      await getDb().update(retailerProducts)
        .set({ gsTotal: newTotal, updatedAt: new Date() })
        .where(eq(retailerProducts.id, rp.id));
    }
  }

  // ─── Retailer-Product Offers ─────────────────────

  async listRetailerProducts(): Promise<(RetailerProduct & { retailerName?: string; productName?: string })[]> {
    const rows = await getDb().select({
      rp: retailerProducts,
      retailerName: retailers.name,
      productName: products.name,
    })
    .from(retailerProducts)
    .leftJoin(retailers, eq(retailerProducts.retailerId, retailers.id))
    .leftJoin(products, eq(retailerProducts.productId, products.id));

    return rows.map(r => ({
      ...r.rp,
      retailerName: r.retailerName ?? undefined,
      productName: r.productName ?? undefined,
    }));
  }

  async getRetailerProduct(id: number): Promise<RetailerProduct | undefined> {
    const [row] = await getDb().select().from(retailerProducts).where(eq(retailerProducts.id, id)).limit(1);
    return row;
  }

  async createRetailerProduct(data: InsertRetailerProduct): Promise<RetailerProduct> {
    const retailer = await this.getRetailer(data.retailerId);
    const product = await this.getProduct(data.productId);
    const baseGs = product?.baseGs || 0;
    const retailerGs = data.retailerGs || 0;
    const gsTotal = this.computeGsTotal(baseGs, retailerGs, retailer);
    const gsMatchType = data.gsMatchType ?? (retailer?.gsMatchPolicy === "none" ? "fixed" : (retailer?.gsMatchPolicy || "fixed"));

    const [row] = await getDb().insert(retailerProducts).values({
      ...data,
      gsMatchType,
      gsTotal,
    }).returning();
    return row;
  }

  async updateRetailerProduct(id: number, data: Partial<InsertRetailerProduct>): Promise<RetailerProduct | undefined> {
    // Get existing to merge
    const existing = await this.getRetailerProduct(id);
    if (!existing) return undefined;

    const merged = { ...existing, ...data };
    const retailer = await this.getRetailer(merged.retailerId);
    const product = await this.getProduct(merged.productId);
    const baseGs = product?.baseGs || 0;
    const gsTotal = this.computeGsTotal(baseGs, merged.retailerGs || 0, retailer);

    const [row] = await getDb().update(retailerProducts)
      .set({ ...data, gsTotal, updatedAt: new Date() })
      .where(eq(retailerProducts.id, id))
      .returning();
    return row;
  }

  async deleteRetailerProduct(id: number): Promise<boolean> {
    const result = await getDb().delete(retailerProducts).where(eq(retailerProducts.id, id)).returning();
    return result.length > 0;
  }

  async getRetailerProducts(retailerId: number): Promise<(RetailerProduct & { productName?: string; productSku?: string; productBrand?: string; productBaseGs?: number })[]> {
    const rows = await getDb().select({
      rp: retailerProducts,
      productName: products.name,
      productSku: products.sku,
      productBrand: products.brand,
      productBaseGs: products.baseGs,
    })
    .from(retailerProducts)
    .leftJoin(products, eq(retailerProducts.productId, products.id))
    .where(eq(retailerProducts.retailerId, retailerId));

    return rows.map(r => ({
      ...r.rp,
      productName: r.productName ?? undefined,
      productSku: r.productSku ?? undefined,
      productBrand: r.productBrand ?? undefined,
      productBaseGs: r.productBaseGs ?? undefined,
    }));
  }

  async getProductRetailers(productId: number): Promise<(RetailerProduct & { retailerName?: string; retailerCode?: string; retailerCountry?: string })[]> {
    const rows = await getDb().select({
      rp: retailerProducts,
      retailerName: retailers.name,
      retailerCode: retailers.code,
      retailerCountry: retailers.country,
    })
    .from(retailerProducts)
    .leftJoin(retailers, eq(retailerProducts.retailerId, retailers.id))
    .where(eq(retailerProducts.productId, productId));

    return rows.map(r => ({
      ...r.rp,
      retailerName: r.retailerName ?? undefined,
      retailerCode: r.retailerCode ?? undefined,
      retailerCountry: r.retailerCountry ?? undefined,
    }));
  }

  async getRetailerProductOffer(retailerId: number, productId: number): Promise<RetailerProduct | undefined> {
    const [row] = await getDb().select().from(retailerProducts)
      .where(and(
        eq(retailerProducts.retailerId, retailerId),
        eq(retailerProducts.productId, productId),
      ))
      .limit(1);
    return row;
  }

  // ─── Countries ───────────────────────────────────

  async listCountries(): Promise<Country[]> {
    return getDb().select().from(countries);
  }

  async getCountry(id: number): Promise<Country | undefined> {
    const [row] = await getDb().select().from(countries).where(eq(countries.id, id)).limit(1);
    return row;
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const [row] = await getDb().insert(countries).values(data).returning();
    return row;
  }

  async updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined> {
    const [row] = await getDb().update(countries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(countries.id, id))
      .returning();
    return row;
  }

  async deleteCountry(id: number): Promise<boolean> {
    const result = await getDb().delete(countries).where(eq(countries.id, id)).returning();
    return result.length > 0;
  }

  // ─── Deals ──────────────────────────────────────

  async listDeals(): Promise<Deal[]> {
    return getDb().select().from(deals);
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [row] = await getDb().select().from(deals).where(eq(deals.id, id)).limit(1);
    return row;
  }

  async createDeal(data: InsertDeal): Promise<Deal> {
    const [row] = await getDb().insert(deals).values(data).returning();
    return row;
  }

  async updateDeal(id: number, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [row] = await getDb().update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return row;
  }

  async deleteDeal(id: number): Promise<boolean> {
    const result = await getDb().delete(deals).where(eq(deals.id, id)).returning();
    return result.length > 0;
  }

  // ─── Volume Tiers ───────────────────────────────

  async listVolumeTiers(): Promise<VolumeTier[]> {
    return getDb().select().from(volumeTiers);
  }

  async getVolumeTier(id: number): Promise<VolumeTier | undefined> {
    const [row] = await getDb().select().from(volumeTiers).where(eq(volumeTiers.id, id)).limit(1);
    return row;
  }

  async updateVolumeTier(id: number, data: Partial<InsertVolumeTier>): Promise<VolumeTier | undefined> {
    const [row] = await getDb().update(volumeTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(volumeTiers.id, id))
      .returning();
    return row;
  }

  // ─── GS Pricing ─────────────────────────────────

  async listGsPricing(): Promise<GsPricing[]> {
    return getDb().select().from(gsPricing);
  }

  async getGsPricing(id: number): Promise<GsPricing | undefined> {
    const [row] = await getDb().select().from(gsPricing).where(eq(gsPricing.id, id)).limit(1);
    return row;
  }

  async updateGsPricing(id: number, data: Partial<InsertGsPricing>): Promise<GsPricing | undefined> {
    const [row] = await getDb().update(gsPricing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gsPricing.id, id))
      .returning();
    return row;
  }

  // ─── Equivalence ────────────────────────────────

  async listEquivalence(): Promise<Equivalence[]> {
    return getDb().select().from(equivalenceConfig);
  }

  async getEquivalence(id: number): Promise<Equivalence | undefined> {
    const [row] = await getDb().select().from(equivalenceConfig).where(eq(equivalenceConfig.id, id)).limit(1);
    return row;
  }

  async updateEquivalence(id: number, data: Partial<InsertEquivalence>): Promise<Equivalence | undefined> {
    const [row] = await getDb().update(equivalenceConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(equivalenceConfig.id, id))
      .returning();
    return row;
  }

  // ─── Value Protection ───────────────────────────

  async listValueProtection(): Promise<ValueProtection[]> {
    return getDb().select().from(valueProtection);
  }

  async getValueProtection(id: number): Promise<ValueProtection | undefined> {
    const [row] = await getDb().select().from(valueProtection).where(eq(valueProtection.id, id)).limit(1);
    return row;
  }

  async updateValueProtection(id: number, data: Partial<InsertValueProtection>): Promise<ValueProtection | undefined> {
    const [row] = await getDb().update(valueProtection)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(valueProtection.id, id))
      .returning();
    return row;
  }

  // ─── Carbon Markets ─────────────────────────────

  async listCarbonMarkets(): Promise<CarbonMarket[]> {
    return getDb().select().from(carbonMarkets);
  }

  async getCarbonMarket(id: number): Promise<CarbonMarket | undefined> {
    const [row] = await getDb().select().from(carbonMarkets).where(eq(carbonMarkets.id, id)).limit(1);
    return row;
  }

  async createCarbonMarket(data: InsertCarbonMarket): Promise<CarbonMarket> {
    const [row] = await getDb().insert(carbonMarkets).values(data).returning();
    return row;
  }

  async updateCarbonMarket(id: number, data: Partial<InsertCarbonMarket>): Promise<CarbonMarket | undefined> {
    const [row] = await getDb().update(carbonMarkets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(carbonMarkets.id, id))
      .returning();
    return row;
  }

  async deleteCarbonMarket(id: number): Promise<boolean> {
    const result = await getDb().delete(carbonMarkets).where(eq(carbonMarkets.id, id)).returning();
    return result.length > 0;
  }

  // ─── C2050 Streams ──────────────────────────────

  async listC2050Streams(): Promise<C2050Stream[]> {
    return getDb().select().from(c2050Streams);
  }

  async getC2050Stream(id: number): Promise<C2050Stream | undefined> {
    const [row] = await getDb().select().from(c2050Streams).where(eq(c2050Streams.id, id)).limit(1);
    return row;
  }

  async updateC2050Stream(id: number, data: Partial<InsertC2050Stream>): Promise<C2050Stream | undefined> {
    const [row] = await getDb().update(c2050Streams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(c2050Streams.id, id))
      .returning();
    return row;
  }

  // ─── Regulatory Updates ─────────────────────────

  async listRegulatoryUpdates(): Promise<RegulatoryUpdate[]> {
    return getDb().select().from(regulatoryUpdates);
  }

  async getRegulatoryUpdate(id: number): Promise<RegulatoryUpdate | undefined> {
    const [row] = await getDb().select().from(regulatoryUpdates).where(eq(regulatoryUpdates.id, id)).limit(1);
    return row;
  }

  async createRegulatoryUpdate(data: InsertRegulatoryUpdate): Promise<RegulatoryUpdate> {
    const [row] = await getDb().insert(regulatoryUpdates).values(data).returning();
    return row;
  }

  async updateRegulatoryUpdate(id: number, data: Partial<InsertRegulatoryUpdate>): Promise<RegulatoryUpdate | undefined> {
    const [row] = await getDb().update(regulatoryUpdates)
      .set(data)
      .where(eq(regulatoryUpdates.id, id))
      .returning();
    return row;
  }

  async deleteRegulatoryUpdate(id: number): Promise<boolean> {
    const result = await getDb().delete(regulatoryUpdates).where(eq(regulatoryUpdates.id, id)).returning();
    return result.length > 0;
  }

  // ─── System Status ──────────────────────────────

  async listSystemStatus(): Promise<SystemStatus[]> {
    return getDb().select().from(systemStatus);
  }

  async getSystemStatus(id: number): Promise<SystemStatus | undefined> {
    const [row] = await getDb().select().from(systemStatus).where(eq(systemStatus.id, id)).limit(1);
    return row;
  }

  async updateSystemStatus(id: number, data: Partial<InsertSystemStatus>): Promise<SystemStatus | undefined> {
    const [row] = await getDb().update(systemStatus)
      .set({ ...data, lastChecked: new Date() })
      .where(eq(systemStatus.id, id))
      .returning();
    return row;
  }

  // ─── Change Log ─────────────────────────────────

  async listChangeLog(limit: number = 50): Promise<ChangeLogEntry[]> {
    return getDb().select().from(changeLog)
      .orderBy(desc(changeLog.createdAt))
      .limit(limit);
  }

  async logChange(action: string, section: string, detail: string, userName: string = "system"): Promise<ChangeLogEntry> {
    const [row] = await getDb().insert(changeLog).values({ action, section, detail, userName }).returning();
    return row;
  }

  // ─── Approval Queue ─────────────────────────────

  async listApprovals(): Promise<Approval[]> {
    return getDb().select().from(approvalQueue);
  }

  async getApproval(id: number): Promise<Approval | undefined> {
    const [row] = await getDb().select().from(approvalQueue).where(eq(approvalQueue.id, id)).limit(1);
    return row;
  }

  async createApproval(data: InsertApproval): Promise<Approval> {
    const [row] = await getDb().insert(approvalQueue).values(data).returning();
    return row;
  }

  async updateApproval(id: number, data: Partial<Approval>): Promise<Approval | undefined> {
    // Remove id from data to avoid overwriting
    const { id: _, ...updateData } = data;
    const [row] = await getDb().update(approvalQueue)
      .set(updateData)
      .where(eq(approvalQueue.id, id))
      .returning();
    return row;
  }

  // ─── Dashboard ──────────────────────────────────

  async getDashboardStats(): Promise<Record<string, any>> {
    // Use parallel queries for efficiency
    const [
      allRetailers,
      allProducts,
      allOffers,
      allDeals,
      allCountries,
      allApprovals,
      allStatus,
    ] = await Promise.all([
      getDb().select().from(retailers),
      getDb().select().from(products),
      getDb().select().from(retailerProducts),
      getDb().select().from(deals),
      getDb().select().from(countries),
      getDb().select().from(approvalQueue),
      getDb().select().from(systemStatus),
    ]);

    const activeRetailers = allRetailers.filter(r => r.status === "active").length;
    const pendingRetailers = allRetailers.filter(r => r.status === "pending").length;
    const activeProducts = allProducts.filter(p => p.status === "active").length;
    const verifiedProducts = allProducts.filter(p => p.verified).length;
    const activeOffers = allOffers.filter(o => o.status === "active").length;
    const totalGsInCirculation = allOffers.reduce((sum, o) => sum + (o.gsTotal || 0), 0);
    const avgGsPerOffer = activeOffers > 0 ? Math.round(totalGsInCirculation / activeOffers) : 0;
    const activeDeals = allDeals.filter(d => d.status === "active").length;
    const pendingDeals = allDeals.filter(d => d.status === "pending").length;
    const activeCountries = allCountries.filter(c => c.status === "active").length;
    const pendingApprovals = allApprovals.filter(a => a.status === "pending").length;
    const operationalServices = allStatus.filter(s => s.status === "operational").length;
    const degradedServices = allStatus.filter(s => s.status === "degraded").length;

    return {
      retailers: { total: allRetailers.length, active: activeRetailers, pending: pendingRetailers },
      products: { total: allProducts.length, active: activeProducts, verified: verifiedProducts },
      offers: { total: allOffers.length, active: activeOffers, totalGs: totalGsInCirculation, avgGsPerOffer },
      deals: { total: allDeals.length, active: activeDeals, pending: pendingDeals },
      countries: { total: allCountries.length, active: activeCountries },
      approvals: { pending: pendingApprovals },
      system: { operational: operationalServices, degraded: degradedServices, total: allStatus.length },
    };
  }
}
