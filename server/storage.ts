import {
  type Retailer, type InsertRetailer,
  type Product, type InsertProduct,
  type RetailerProduct, type InsertRetailerProduct,
  type Country, type InsertCountry,
  type Deal, type InsertDeal,
  type VolumeTier, type InsertVolumeTier,
  type GsPricing, type InsertGsPricing,
  type Equivalence, type InsertEquivalence,
  type ValueProtection, type InsertValueProtection,
  type CarbonMarket, type InsertCarbonMarket,
  type C2050Stream, type InsertC2050Stream,
  type RegulatoryUpdate, type InsertRegulatoryUpdate,
  type SystemStatus, type InsertSystemStatus,
  type ChangeLogEntry, type InsertChangeLog,
  type Approval, type InsertApproval,
} from "@shared/schema";
import { DatabaseStorage } from "./dbStorage";

// ═══════════════════════════════════════════════════
//  STORAGE INTERFACE
// ═══════════════════════════════════════════════════

export interface IStorage {
  // Retailers
  listRetailers(): Promise<Retailer[]>;
  getRetailer(id: number): Promise<Retailer | undefined>;
  createRetailer(data: InsertRetailer): Promise<Retailer>;
  updateRetailer(id: number, data: Partial<InsertRetailer>): Promise<Retailer | undefined>;
  deleteRetailer(id: number): Promise<boolean>;

  // Products
  listProducts(filters?: { brand?: string }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Retailer-Product offers
  listRetailerProducts(): Promise<(RetailerProduct & { retailerName?: string; productName?: string })[]>;
  getRetailerProduct(id: number): Promise<RetailerProduct | undefined>;
  createRetailerProduct(data: InsertRetailerProduct): Promise<RetailerProduct>;
  updateRetailerProduct(id: number, data: Partial<InsertRetailerProduct>): Promise<RetailerProduct | undefined>;
  deleteRetailerProduct(id: number): Promise<boolean>;
  getRetailerProducts(retailerId: number): Promise<(RetailerProduct & { productName?: string; productSku?: string; productBrand?: string; productBaseGs?: number })[]>;
  getProductRetailers(productId: number): Promise<(RetailerProduct & { retailerName?: string; retailerCode?: string; retailerCountry?: string })[]>;
  getRetailerProductOffer(retailerId: number, productId: number): Promise<RetailerProduct | undefined>;

  // Countries
  listCountries(): Promise<Country[]>;
  getCountry(id: number): Promise<Country | undefined>;
  createCountry(data: InsertCountry): Promise<Country>;
  updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined>;
  deleteCountry(id: number): Promise<boolean>;

  // Deals
  listDeals(): Promise<Deal[]>;
  getDeal(id: number): Promise<Deal | undefined>;
  createDeal(data: InsertDeal): Promise<Deal>;
  updateDeal(id: number, data: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;

  // Volume Tiers
  listVolumeTiers(): Promise<VolumeTier[]>;
  getVolumeTier(id: number): Promise<VolumeTier | undefined>;
  updateVolumeTier(id: number, data: Partial<InsertVolumeTier>): Promise<VolumeTier | undefined>;

  // GS Pricing
  listGsPricing(): Promise<GsPricing[]>;
  getGsPricing(id: number): Promise<GsPricing | undefined>;
  updateGsPricing(id: number, data: Partial<InsertGsPricing>): Promise<GsPricing | undefined>;

  // Equivalence
  listEquivalence(): Promise<Equivalence[]>;
  getEquivalence(id: number): Promise<Equivalence | undefined>;
  updateEquivalence(id: number, data: Partial<InsertEquivalence>): Promise<Equivalence | undefined>;

  // Value Protection
  listValueProtection(): Promise<ValueProtection[]>;
  getValueProtection(id: number): Promise<ValueProtection | undefined>;
  updateValueProtection(id: number, data: Partial<InsertValueProtection>): Promise<ValueProtection | undefined>;

  // Carbon Markets
  listCarbonMarkets(): Promise<CarbonMarket[]>;
  getCarbonMarket(id: number): Promise<CarbonMarket | undefined>;
  createCarbonMarket(data: InsertCarbonMarket): Promise<CarbonMarket>;
  updateCarbonMarket(id: number, data: Partial<InsertCarbonMarket>): Promise<CarbonMarket | undefined>;
  deleteCarbonMarket(id: number): Promise<boolean>;

  // C2050 Streams
  listC2050Streams(): Promise<C2050Stream[]>;
  getC2050Stream(id: number): Promise<C2050Stream | undefined>;
  updateC2050Stream(id: number, data: Partial<InsertC2050Stream>): Promise<C2050Stream | undefined>;

  // Regulatory Updates
  listRegulatoryUpdates(): Promise<RegulatoryUpdate[]>;
  getRegulatoryUpdate(id: number): Promise<RegulatoryUpdate | undefined>;
  createRegulatoryUpdate(data: InsertRegulatoryUpdate): Promise<RegulatoryUpdate>;
  updateRegulatoryUpdate(id: number, data: Partial<InsertRegulatoryUpdate>): Promise<RegulatoryUpdate | undefined>;
  deleteRegulatoryUpdate(id: number): Promise<boolean>;

  // System Status
  listSystemStatus(): Promise<SystemStatus[]>;
  getSystemStatus(id: number): Promise<SystemStatus | undefined>;
  updateSystemStatus(id: number, data: Partial<InsertSystemStatus>): Promise<SystemStatus | undefined>;

  // Change Log
  listChangeLog(limit?: number): Promise<ChangeLogEntry[]>;
  logChange(action: string, section: string, detail: string, userName?: string): Promise<ChangeLogEntry>;

  // Approval Queue
  listApprovals(): Promise<Approval[]>;
  getApproval(id: number): Promise<Approval | undefined>;
  createApproval(data: InsertApproval): Promise<Approval>;
  updateApproval(id: number, data: Partial<Approval>): Promise<Approval | undefined>;

  // Dashboard
  getDashboardStats(): Promise<Record<string, any>>;
}

// ═══════════════════════════════════════════════════
//  IN-MEMORY STORAGE IMPLEMENTATION
// ═══════════════════════════════════════════════════

export class MemStorage implements IStorage {
  // Primary stores
  private retailers: Map<number, Retailer> = new Map();
  private products: Map<number, Product> = new Map();
  private retailerProductsMap: Map<number, RetailerProduct> = new Map();
  private countriesMap: Map<number, Country> = new Map();
  private dealsMap: Map<number, Deal> = new Map();
  private volumeTiersMap: Map<number, VolumeTier> = new Map();
  private gsPricingMap: Map<number, GsPricing> = new Map();
  private equivalenceMap: Map<number, Equivalence> = new Map();
  private valueProtectionMap: Map<number, ValueProtection> = new Map();
  private carbonMarketsMap: Map<number, CarbonMarket> = new Map();
  private c2050StreamsMap: Map<number, C2050Stream> = new Map();
  private regulatoryMap: Map<number, RegulatoryUpdate> = new Map();
  private systemStatusMap: Map<number, SystemStatus> = new Map();
  private changeLogMap: Map<number, ChangeLogEntry> = new Map();
  private approvalMap: Map<number, Approval> = new Map();

  // Secondary indexes for retailer_products (O(1) lookups)
  private rpByRetailer: Map<number, Set<number>> = new Map(); // retailerId -> Set<rpId>
  private rpByProduct: Map<number, Set<number>> = new Map();  // productId -> Set<rpId>

  // Auto-incrementing IDs
  private nextId: Record<string, number> = {
    retailers: 1,
    products: 1,
    retailerProducts: 1,
    countries: 1,
    deals: 1,
    volumeTiers: 1,
    gsPricing: 1,
    equivalence: 1,
    valueProtection: 1,
    carbonMarkets: 1,
    c2050Streams: 1,
    regulatory: 1,
    systemStatus: 1,
    changeLog: 1,
    approvals: 1,
  };

  constructor() {
    this.seed();
  }

  private getId(table: string): number {
    const id = this.nextId[table]!;
    this.nextId[table] = id + 1;
    return id;
  }

  private now(): Date {
    return new Date();
  }

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

  // ═══════ SECONDARY INDEX HELPERS ═══════
  private addRpIndex(rp: RetailerProduct): void {
    if (!this.rpByRetailer.has(rp.retailerId)) {
      this.rpByRetailer.set(rp.retailerId, new Set());
    }
    this.rpByRetailer.get(rp.retailerId)!.add(rp.id);

    if (!this.rpByProduct.has(rp.productId)) {
      this.rpByProduct.set(rp.productId, new Set());
    }
    this.rpByProduct.get(rp.productId)!.add(rp.id);
  }

  private removeRpIndex(rp: RetailerProduct): void {
    this.rpByRetailer.get(rp.retailerId)?.delete(rp.id);
    this.rpByProduct.get(rp.productId)?.delete(rp.id);
  }

  private getRpIdsArray(setMap: Map<number, Set<number>>, key: number): number[] {
    const s = setMap.get(key);
    return s ? Array.from(s) : [];
  }

  // ═══════════════════════════════════════════════════
  //  SEED DATA
  // ═══════════════════════════════════════════════════

  private seed(): void {
    this.seedRetailers();
    this.seedProducts();
    this.seedRetailerProducts();
    this.seedCountries();
    this.seedDeals();
    this.seedVolumeTiers();
    this.seedGsPricing();
    this.seedEquivalence();
    this.seedValueProtection();
    this.seedCarbonMarkets();
    this.seedC2050Streams();
    this.seedRegulatory();
    this.seedSystemStatus();
    this.seedChangeLog();
    this.seedApprovals();
  }

  private seedRetailers(): void {
    const data: Omit<Retailer, "id" | "createdAt" | "updatedAt">[] = [
      { name: "Tesco", code: "TESCO", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 100, contactEmail: "gs@tesco.com", notes: "Full GS match — 100% of base GS" },
      { name: "Sainsbury's", code: "SAINS", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "fixed", gsMatchValue: 10, contactEmail: "sustainability@sainsburys.co.uk", notes: "Fixed 10 GS top-up per product" },
      { name: "Asda", code: "ASDA", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 50, contactEmail: "gs@asda.com", notes: "50% GS match on base" },
      { name: "Waitrose", code: "WAITR", country: "UK", flag: "🇬🇧", status: "active", gsMatchPolicy: "fixed", gsMatchValue: 15, contactEmail: "partners@waitrose.com", notes: "Fixed 15 GS premium top-up" },
      { name: "Woolworths", code: "WOOLW", country: "AU", flag: "🇦🇺", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 75, contactEmail: "gs@woolworths.com.au", notes: "75% GS match — Australian pilot" },
      { name: "NTUC FairPrice", code: "NTUC", country: "SG", flag: "🇸🇬", status: "pending", gsMatchPolicy: "fixed", gsMatchValue: 5, contactEmail: "sustainability@fairprice.com.sg", notes: "Fixed 5 GS — Singapore trial" },
      { name: "Carrefour", code: "CARRF", country: "EU/FR", flag: "🇫🇷", status: "active", gsMatchPolicy: "percentage", gsMatchValue: 50, contactEmail: "gs@carrefour.fr", notes: "50% GS match — EU expansion" },
      { name: "Whole Foods", code: "WHOLEF", country: "US", flag: "🇺🇸", status: "pending", gsMatchPolicy: "fixed", gsMatchValue: 8, contactEmail: "gs@wholefoods.com", notes: "Fixed 8 GS — US market entry" },
    ];
    for (const d of data) {
      const id = this.getId("retailers");
      this.retailers.set(id, { id, ...d, createdAt: this.now(), updatedAt: this.now() });
    }
  }

  private seedProducts(): void {
    const data: Omit<Product, "id" | "createdAt" | "updatedAt">[] = [
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
    for (const d of data) {
      const id = this.getId("products");
      this.products.set(id, { id, ...d, createdAt: this.now(), updatedAt: this.now() });
    }
  }

  private seedRetailerProducts(): void {
    // retailer IDs: 1=Tesco, 2=Sainsbury's, 3=Asda, 4=Waitrose, 5=Woolworths, 6=NTUC, 7=Carrefour, 8=Whole Foods
    // product IDs: 1=Beans, 2=Ketchup, 3=Smoothie, 4=Quorn, 5=Oatly, 6=BnJ, 7=Ecover, 8=Method, 9=WGAC, 10=Tony's, 11=Clipper, 12=Seed&Bean
    const offers: { retailerId: number; productId: number; retailerGs: number; priceLocal: string }[] = [
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

    for (const o of offers) {
      const id = this.getId("retailerProducts");
      const retailer = this.retailers.get(o.retailerId);
      const product = this.products.get(o.productId);
      const baseGs = product?.baseGs || 0;
      const gsTotal = this.computeGsTotal(baseGs, o.retailerGs, retailer);

      const rp: RetailerProduct = {
        id,
        retailerId: o.retailerId,
        productId: o.productId,
        retailerGs: o.retailerGs,
        gsMatchType: retailer?.gsMatchPolicy === "none" ? "fixed" : (retailer?.gsMatchPolicy || "fixed"),
        gsTotal,
        priceLocal: o.priceLocal,
        status: "active",
        validFrom: this.now(),
        validTo: null,
        createdAt: this.now(),
        updatedAt: this.now(),
      };
      this.retailerProductsMap.set(id, rp);
      this.addRpIndex(rp);
    }
  }

  private seedCountries(): void {
    const data: Omit<Country, "id" | "updatedAt">[] = [
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
    for (const d of data) {
      const id = this.getId("countries");
      this.countriesMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedDeals(): void {
    const data: Omit<Deal, "id" | "createdAt" | "updatedAt">[] = [
      { name: "Tesco UK National", country: "UK", flag: "🇬🇧", volume: "5M GS/yr", price: "£0.09/GS", level: 3, score: 92, status: "active", type: "corporate", notes: "Flagship UK deal" },
      { name: "Woolworths AU Pilot", country: "AU", flag: "🇦🇺", volume: "1M GS/yr", price: "A$0.08/GS", level: 2, score: 78, status: "active", type: "pilot", notes: "Trial period — 6 months" },
      { name: "Carrefour EU Expansion", country: "EU/FR", flag: "🇫🇷", volume: "3M GS/yr", price: "€0.11/GS", level: 2, score: 85, status: "pending", type: "corporate", notes: "Pending board sign-off" },
      { name: "NTUC SG Entry", country: "SG", flag: "🇸🇬", volume: "500K GS/yr", price: "S$0.09/GS", level: 1, score: 60, status: "pending", type: "pilot", notes: "Exploratory phase" },
      { name: "Whole Foods US Launch", country: "US", flag: "🇺🇸", volume: "2M GS/yr", price: "$0.07/GS", level: 1, score: 55, status: "pending", type: "corporate", notes: "Initial discussions" },
      { name: "Sainsbury's Green Range", country: "UK", flag: "🇬🇧", volume: "4M GS/yr", price: "£0.10/GS", level: 3, score: 88, status: "active", type: "corporate", notes: "Premium green product line" },
      { name: "Waitrose Premium Partner", country: "UK", flag: "🇬🇧", volume: "2M GS/yr", price: "£0.12/GS", level: 2, score: 80, status: "active", type: "premium", notes: "Higher GS match rate" },
    ];
    for (const d of data) {
      const id = this.getId("deals");
      this.dealsMap.set(id, { id, ...d, createdAt: this.now(), updatedAt: this.now() });
    }
  }

  private seedVolumeTiers(): void {
    const data: Omit<VolumeTier, "id" | "updatedAt">[] = [
      { name: "Standard", threshold: "0 – 100K GS", pricePerGs: "£0.12/GS", discount: "0%", description: "Entry-level for small brands and trials" },
      { name: "Mid-Tier", threshold: "100K – 1M GS", pricePerGs: "£0.10/GS", discount: "17%", description: "Growth phase — most regional retailers" },
      { name: "Major", threshold: "1M – 10M GS", pricePerGs: "£0.08/GS", discount: "33%", description: "National retailer standard" },
      { name: "Enterprise", threshold: "10M+ GS", pricePerGs: "£0.06/GS", discount: "50%", description: "Multi-market enterprise agreements" },
    ];
    for (const d of data) {
      const id = this.getId("volumeTiers");
      this.volumeTiersMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedGsPricing(): void {
    const data: Omit<GsPricing, "id" | "updatedAt">[] = [
      { tierName: "Standard Retail", pricePerGs: "£0.12", volumeRange: "0 – 100K", discountPct: "0%", description: "Base retail pricing" },
      { tierName: "Growth Partner", pricePerGs: "£0.10", volumeRange: "100K – 500K", discountPct: "17%", description: "Growing brand discount" },
      { tierName: "National Partner", pricePerGs: "£0.08", volumeRange: "500K – 5M", discountPct: "33%", description: "National-scale pricing" },
      { tierName: "Enterprise", pricePerGs: "£0.06", volumeRange: "5M – 50M", discountPct: "50%", description: "Enterprise volume pricing" },
      { tierName: "Cause-Based Partner", pricePerGs: "£0.04", volumeRange: "Any", discountPct: "67%", description: "Non-profit / B-Corp / cause-led brands" },
    ];
    for (const d of data) {
      const id = this.getId("gsPricing");
      this.gsPricingMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedEquivalence(): void {
    const data: Omit<Equivalence, "id" | "updatedAt">[] = [
      { dimension: "Carbon", percentage: 32, gsValue: "3.2 GS per 1 tCO₂e", description: "Carbon offset equivalence — primary weight" },
      { dimension: "Biodiversity", percentage: 60, gsValue: "6.0 GS per biodiversity unit", description: "Biodiversity net gain — highest weight" },
      { dimension: "Animal Welfare", percentage: 3, gsValue: "0.3 GS per welfare unit", description: "Animal welfare standards compliance" },
      { dimension: "Water & Soil", percentage: 5, gsValue: "0.5 GS per water/soil unit", description: "Water stewardship and soil health" },
    ];
    for (const d of data) {
      const id = this.getId("equivalence");
      this.equivalenceMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedValueProtection(): void {
    const data: Omit<ValueProtection, "id" | "updatedAt">[] = [
      { dimension: "Carbon Integrity", weight: 30, description: "Verified carbon credit quality and additionality" },
      { dimension: "Supply Chain Traceability", weight: 25, description: "End-to-end product provenance tracking" },
      { dimension: "Biodiversity Impact", weight: 20, description: "Measurable biodiversity net gain" },
      { dimension: "Social Value", weight: 10, description: "Community and workforce impact metrics" },
      { dimension: "Circular Economy", weight: 10, description: "Packaging recyclability and waste reduction" },
      { dimension: "Water Stewardship", weight: 5, description: "Water usage efficiency and watershed protection" },
    ];
    for (const d of data) {
      const id = this.getId("valueProtection");
      this.valueProtectionMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedCarbonMarkets(): void {
    const data: Omit<CarbonMarket, "id" | "updatedAt">[] = [
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
    for (const d of data) {
      const id = this.getId("carbonMarkets");
      this.carbonMarketsMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedC2050Streams(): void {
    const data: Omit<C2050Stream, "id" | "updatedAt">[] = [
      { stream: "IPCC AR6 Working Group Updates", frequency: "Quarterly", source: "IPCC", status: "live", lastUpdate: "2026-01-15" },
      { stream: "EU CBAM Implementation Tracker", frequency: "Monthly", source: "European Commission", status: "live", lastUpdate: "2026-02-28" },
      { stream: "Global Carbon Budget", frequency: "Annual", source: "Global Carbon Project", status: "live", lastUpdate: "2025-12-05" },
      { stream: "NDC Progress Dashboard", frequency: "Bi-annual", source: "UNFCCC", status: "live", lastUpdate: "2025-11-10" },
      { stream: "Corporate Net-Zero Tracker", frequency: "Monthly", source: "Net Zero Tracker / CA100+", status: "live", lastUpdate: "2026-03-01" },
      { stream: "Biodiversity Credit Standards", frequency: "Quarterly", source: "TNFD / Verra", status: "pending", lastUpdate: "2025-09-20" },
    ];
    for (const d of data) {
      const id = this.getId("c2050Streams");
      this.c2050StreamsMap.set(id, { id, ...d, updatedAt: this.now() });
    }
  }

  private seedRegulatory(): void {
    const data: Omit<RegulatoryUpdate, "id" | "createdAt">[] = [
      { title: "EU CBAM Phase 2 — Full Carbon Pricing", jurisdiction: "EU", category: "carbon pricing", date: "2026-01-01", summary: "Full CBAM tariffs apply to imports of steel, cement, aluminium, fertiliser, electricity, and hydrogen.", impact: "high", status: "active" },
      { title: "UK Carbon Border Adjustment Mechanism", jurisdiction: "UK", category: "carbon pricing", date: "2027-01-01", summary: "UK CBAM consultation complete — implementation date set for 2027.", impact: "high", status: "active" },
      { title: "Australia Safeguard Mechanism Reform", jurisdiction: "AU", category: "emissions cap", date: "2025-07-01", summary: "Tighter baselines for top 215 emitters — 4.9% annual decline required.", impact: "medium", status: "active" },
      { title: "Singapore Carbon Tax Increase", jurisdiction: "SG", category: "carbon pricing", date: "2026-01-01", summary: "Carbon tax rises to S$25/tCO₂e, with trajectory to S$50-80 by 2030.", impact: "medium", status: "active" },
      { title: "California Advanced Clean Fleets Rule", jurisdiction: "US/CA", category: "transport", date: "2025-01-01", summary: "Zero-emission vehicle requirements for medium/heavy-duty fleets.", impact: "low", status: "active" },
    ];
    for (const d of data) {
      const id = this.getId("regulatory");
      this.regulatoryMap.set(id, { id, ...d, createdAt: this.now() });
    }
  }

  private seedSystemStatus(): void {
    const data: Omit<SystemStatus, "id" | "lastChecked">[] = [
      { service: "GS Core API", status: "operational", uptime: "99.98%", notes: "" },
      { service: "Retailer Sync Engine", status: "operational", uptime: "99.95%", notes: "" },
      { service: "Carbon Data Pipeline", status: "operational", uptime: "99.90%", notes: "" },
      { service: "Equivalence Calculator", status: "operational", uptime: "99.99%", notes: "" },
      { service: "Payment Gateway", status: "operational", uptime: "99.97%", notes: "" },
      { service: "C2050 Data Feed", status: "degraded", uptime: "98.50%", notes: "Intermittent latency on biodiversity stream" },
      { service: "Notification Service", status: "operational", uptime: "99.92%", notes: "" },
      { service: "Compliance Checker", status: "operational", uptime: "99.88%", notes: "" },
    ];
    for (const d of data) {
      const id = this.getId("systemStatus");
      this.systemStatusMap.set(id, { id, ...d, lastChecked: this.now() });
    }
  }

  private seedChangeLog(): void {
    const entries: Omit<ChangeLogEntry, "id" | "createdAt">[] = [
      { action: "created", section: "retailers", detail: "Added Tesco as active retailer with 100% GS match", userName: "admin" },
      { action: "created", section: "retailers", detail: "Added Sainsbury's with fixed 10 GS match policy", userName: "admin" },
      { action: "updated", section: "products", detail: "Verified Heinz Baked Beans — baseGs set to 10", userName: "admin" },
      { action: "created", section: "deals", detail: "Created Tesco UK National deal — 5M GS/yr", userName: "admin" },
      { action: "updated", section: "equivalence", detail: "Updated carbon equivalence to 32%", userName: "system" },
      { action: "created", section: "countries", detail: "Added 15 country configurations", userName: "system" },
      { action: "updated", section: "system", detail: "C2050 Data Feed status changed to degraded", userName: "system" },
    ];
    for (const e of entries) {
      const id = this.getId("changeLog");
      this.changeLogMap.set(id, { id, ...e, createdAt: new Date(Date.now() - (7 - id) * 3600000) });
    }
  }

  private seedApprovals(): void {
    const data: Omit<Approval, "id" | "createdAt" | "resolvedAt">[] = [
      { title: "Add NTUC FairPrice as active retailer", type: "retailer activation", submittedBy: "ops-team", detail: "Promote NTUC from pending to active status after SG trial", priority: "high", status: "pending", resolvedBy: null },
      { title: "Update Carrefour GS match to 75%", type: "pricing change", submittedBy: "commercial", detail: "Increase Carrefour GS match from 50% to 75% following contract renegotiation", priority: "normal", status: "pending", resolvedBy: null },
      { title: "Add Whole Foods US deal", type: "deal creation", submittedBy: "business-dev", detail: "New enterprise deal — 2M GS/yr at $0.07/GS", priority: "normal", status: "pending", resolvedBy: null },
    ];
    for (const d of data) {
      const id = this.getId("approvals");
      this.approvalMap.set(id, { id, ...d, createdAt: this.now(), resolvedAt: null });
    }
  }

  // ═══════════════════════════════════════════════════
  //  CRUD IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════

  // ─── Retailers ───────────────────────────────────

  async listRetailers(): Promise<Retailer[]> {
    return Array.from(this.retailers.values());
  }

  async getRetailer(id: number): Promise<Retailer | undefined> {
    return this.retailers.get(id);
  }

  async createRetailer(data: InsertRetailer): Promise<Retailer> {
    const id = this.getId("retailers");
    const retailer: Retailer = {
      id,
      name: data.name,
      code: data.code,
      country: data.country ?? "UK",
      flag: data.flag ?? "🇬🇧",
      status: data.status ?? "active",
      gsMatchPolicy: data.gsMatchPolicy ?? "none",
      gsMatchValue: data.gsMatchValue ?? 0,
      contactEmail: data.contactEmail ?? "",
      notes: data.notes ?? "",
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.retailers.set(id, retailer);
    return retailer;
  }

  async updateRetailer(id: number, data: Partial<InsertRetailer>): Promise<Retailer | undefined> {
    const existing = this.retailers.get(id);
    if (!existing) return undefined;
    const updated: Retailer = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.retailers.set(id, updated);
    // Recompute gsTotal for all offers of this retailer when match policy changes
    if (data.gsMatchPolicy !== undefined || data.gsMatchValue !== undefined) {
      await this.recomputeRetailerOffers(id);
    }
    return updated;
  }

  async deleteRetailer(id: number): Promise<boolean> {
    return this.retailers.delete(id);
  }

  private async recomputeRetailerOffers(retailerId: number): Promise<void> {
    const rpIds = this.getRpIdsArray(this.rpByRetailer, retailerId);
    const retailer = this.retailers.get(retailerId);
    for (const rpId of rpIds) {
      const rp = this.retailerProductsMap.get(rpId);
      if (!rp) continue;
      const product = this.products.get(rp.productId);
      const baseGs = product?.baseGs || 0;
      rp.gsTotal = this.computeGsTotal(baseGs, rp.retailerGs || 0, retailer);
      rp.updatedAt = this.now();
    }
  }

  // ─── Products ────────────────────────────────────

  async listProducts(filters?: { brand?: string }): Promise<Product[]> {
    let results = Array.from(this.products.values());
    if (filters?.brand) {
      const b = filters.brand.toLowerCase();
      results = results.filter(p => p.brand.toLowerCase() === b);
    }
    return results;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const id = this.getId("products");
    const product: Product = {
      id,
      name: data.name,
      sku: data.sku,
      brand: data.brand,
      category: data.category ?? "grocery",
      baseGs: data.baseGs ?? 0,
      carbonPct: data.carbonPct ?? 10,
      verified: data.verified ?? false,
      status: data.status ?? "active",
      notes: data.notes ?? "",
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated: Product = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.products.set(id, updated);
    // Recompute gsTotal for all offers of this product when baseGs changes
    if (data.baseGs !== undefined) {
      await this.recomputeProductOffers(id);
    }
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  private async recomputeProductOffers(productId: number): Promise<void> {
    const rpIds = this.getRpIdsArray(this.rpByProduct, productId);
    const product = this.products.get(productId);
    const baseGs = product?.baseGs || 0;
    for (const rpId of rpIds) {
      const rp = this.retailerProductsMap.get(rpId);
      if (!rp) continue;
      const retailer = this.retailers.get(rp.retailerId);
      rp.gsTotal = this.computeGsTotal(baseGs, rp.retailerGs || 0, retailer);
      rp.updatedAt = this.now();
    }
  }

  // ─── Retailer-Product Offers ─────────────────────

  async listRetailerProducts(): Promise<(RetailerProduct & { retailerName?: string; productName?: string })[]> {
    return Array.from(this.retailerProductsMap.values()).map(rp => ({
      ...rp,
      retailerName: this.retailers.get(rp.retailerId)?.name,
      productName: this.products.get(rp.productId)?.name,
    }));
  }

  async getRetailerProduct(id: number): Promise<RetailerProduct | undefined> {
    return this.retailerProductsMap.get(id);
  }

  async createRetailerProduct(data: InsertRetailerProduct): Promise<RetailerProduct> {
    const id = this.getId("retailerProducts");
    const retailer = this.retailers.get(data.retailerId);
    const product = this.products.get(data.productId);
    const baseGs = product?.baseGs || 0;
    const retailerGs = data.retailerGs || 0;
    const gsTotal = this.computeGsTotal(baseGs, retailerGs, retailer);

    const rp: RetailerProduct = {
      id,
      retailerId: data.retailerId,
      productId: data.productId,
      retailerGs: data.retailerGs ?? 0,
      gsMatchType: data.gsMatchType ?? (retailer?.gsMatchPolicy === "none" ? "fixed" : (retailer?.gsMatchPolicy || "fixed")),
      gsTotal,
      priceLocal: data.priceLocal ?? "",
      status: data.status ?? "active",
      validFrom: data.validFrom ?? this.now(),
      validTo: data.validTo ?? null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.retailerProductsMap.set(id, rp);
    this.addRpIndex(rp);
    return rp;
  }

  async updateRetailerProduct(id: number, data: Partial<InsertRetailerProduct>): Promise<RetailerProduct | undefined> {
    const existing = this.retailerProductsMap.get(id);
    if (!existing) return undefined;
    const updated: RetailerProduct = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    // Recompute gsTotal
    const retailer = this.retailers.get(updated.retailerId);
    const product = this.products.get(updated.productId);
    const baseGs = product?.baseGs || 0;
    updated.gsTotal = this.computeGsTotal(baseGs, updated.retailerGs || 0, retailer);
    this.retailerProductsMap.set(id, updated);
    return updated;
  }

  async deleteRetailerProduct(id: number): Promise<boolean> {
    const rp = this.retailerProductsMap.get(id);
    if (rp) {
      this.removeRpIndex(rp);
    }
    return this.retailerProductsMap.delete(id);
  }

  async getRetailerProducts(retailerId: number): Promise<(RetailerProduct & { productName?: string; productSku?: string; productBrand?: string; productBaseGs?: number })[]> {
    const rpIds = this.getRpIdsArray(this.rpByRetailer, retailerId);
    const results: (RetailerProduct & { productName?: string; productSku?: string; productBrand?: string; productBaseGs?: number })[] = [];
    for (const rpId of rpIds) {
      const rp = this.retailerProductsMap.get(rpId);
      if (!rp) continue;
      const product = this.products.get(rp.productId);
      results.push({
        ...rp,
        productName: product?.name,
        productSku: product?.sku,
        productBrand: product?.brand,
        productBaseGs: product?.baseGs,
      });
    }
    return results;
  }

  async getProductRetailers(productId: number): Promise<(RetailerProduct & { retailerName?: string; retailerCode?: string; retailerCountry?: string })[]> {
    const rpIds = this.getRpIdsArray(this.rpByProduct, productId);
    const results: (RetailerProduct & { retailerName?: string; retailerCode?: string; retailerCountry?: string })[] = [];
    for (const rpId of rpIds) {
      const rp = this.retailerProductsMap.get(rpId);
      if (!rp) continue;
      const retailer = this.retailers.get(rp.retailerId);
      results.push({
        ...rp,
        retailerName: retailer?.name,
        retailerCode: retailer?.code,
        retailerCountry: retailer?.country,
      });
    }
    return results;
  }

  async getRetailerProductOffer(retailerId: number, productId: number): Promise<RetailerProduct | undefined> {
    const rpIds = this.getRpIdsArray(this.rpByRetailer, retailerId);
    for (const rpId of rpIds) {
      const rp = this.retailerProductsMap.get(rpId);
      if (rp && rp.productId === productId) return rp;
    }
    return undefined;
  }

  // ─── Countries ───────────────────────────────────

  async listCountries(): Promise<Country[]> {
    return Array.from(this.countriesMap.values());
  }

  async getCountry(id: number): Promise<Country | undefined> {
    return this.countriesMap.get(id);
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const id = this.getId("countries");
    const country: Country = {
      id,
      name: data.name,
      flag: data.flag ?? "",
      carbonReference: data.carbonReference ?? "",
      gsPrice: data.gsPrice ?? "",
      floorPrice: data.floorPrice ?? "",
      complianceFramework: data.complianceFramework ?? "",
      readiness: data.readiness ?? 0,
      status: data.status ?? "planned",
      updatedAt: this.now(),
    };
    this.countriesMap.set(id, country);
    return country;
  }

  async updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined> {
    const existing = this.countriesMap.get(id);
    if (!existing) return undefined;
    const updated: Country = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.countriesMap.set(id, updated);
    return updated;
  }

  async deleteCountry(id: number): Promise<boolean> {
    return this.countriesMap.delete(id);
  }

  // ─── Deals ──────────────────────────────────────

  async listDeals(): Promise<Deal[]> {
    return Array.from(this.dealsMap.values());
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    return this.dealsMap.get(id);
  }

  async createDeal(data: InsertDeal): Promise<Deal> {
    const id = this.getId("deals");
    const deal: Deal = {
      id,
      name: data.name,
      country: data.country ?? "",
      flag: data.flag ?? "",
      volume: data.volume ?? "",
      price: data.price ?? "",
      level: data.level ?? 1,
      score: data.score ?? 0,
      status: data.status ?? "pending",
      type: data.type ?? "corporate",
      notes: data.notes ?? "",
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.dealsMap.set(id, deal);
    return deal;
  }

  async updateDeal(id: number, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const existing = this.dealsMap.get(id);
    if (!existing) return undefined;
    const updated: Deal = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.dealsMap.set(id, updated);
    return updated;
  }

  async deleteDeal(id: number): Promise<boolean> {
    return this.dealsMap.delete(id);
  }

  // ─── Volume Tiers ───────────────────────────────

  async listVolumeTiers(): Promise<VolumeTier[]> {
    return Array.from(this.volumeTiersMap.values());
  }

  async getVolumeTier(id: number): Promise<VolumeTier | undefined> {
    return this.volumeTiersMap.get(id);
  }

  async updateVolumeTier(id: number, data: Partial<InsertVolumeTier>): Promise<VolumeTier | undefined> {
    const existing = this.volumeTiersMap.get(id);
    if (!existing) return undefined;
    const updated: VolumeTier = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.volumeTiersMap.set(id, updated);
    return updated;
  }

  // ─── GS Pricing ─────────────────────────────────

  async listGsPricing(): Promise<GsPricing[]> {
    return Array.from(this.gsPricingMap.values());
  }

  async getGsPricing(id: number): Promise<GsPricing | undefined> {
    return this.gsPricingMap.get(id);
  }

  async updateGsPricing(id: number, data: Partial<InsertGsPricing>): Promise<GsPricing | undefined> {
    const existing = this.gsPricingMap.get(id);
    if (!existing) return undefined;
    const updated: GsPricing = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.gsPricingMap.set(id, updated);
    return updated;
  }

  // ─── Equivalence ────────────────────────────────

  async listEquivalence(): Promise<Equivalence[]> {
    return Array.from(this.equivalenceMap.values());
  }

  async getEquivalence(id: number): Promise<Equivalence | undefined> {
    return this.equivalenceMap.get(id);
  }

  async updateEquivalence(id: number, data: Partial<InsertEquivalence>): Promise<Equivalence | undefined> {
    const existing = this.equivalenceMap.get(id);
    if (!existing) return undefined;
    const updated: Equivalence = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.equivalenceMap.set(id, updated);
    return updated;
  }

  // ─── Value Protection ───────────────────────────

  async listValueProtection(): Promise<ValueProtection[]> {
    return Array.from(this.valueProtectionMap.values());
  }

  async getValueProtection(id: number): Promise<ValueProtection | undefined> {
    return this.valueProtectionMap.get(id);
  }

  async updateValueProtection(id: number, data: Partial<InsertValueProtection>): Promise<ValueProtection | undefined> {
    const existing = this.valueProtectionMap.get(id);
    if (!existing) return undefined;
    const updated: ValueProtection = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.valueProtectionMap.set(id, updated);
    return updated;
  }

  // ─── Carbon Markets ─────────────────────────────

  async listCarbonMarkets(): Promise<CarbonMarket[]> {
    return Array.from(this.carbonMarketsMap.values());
  }

  async getCarbonMarket(id: number): Promise<CarbonMarket | undefined> {
    return this.carbonMarketsMap.get(id);
  }

  async createCarbonMarket(data: InsertCarbonMarket): Promise<CarbonMarket> {
    const id = this.getId("carbonMarkets");
    const market: CarbonMarket = {
      id,
      name: data.name,
      price: data.price ?? "",
      delta: data.delta ?? "",
      trendUp: data.trendUp ?? true,
      updatedAt: this.now(),
    };
    this.carbonMarketsMap.set(id, market);
    return market;
  }

  async updateCarbonMarket(id: number, data: Partial<InsertCarbonMarket>): Promise<CarbonMarket | undefined> {
    const existing = this.carbonMarketsMap.get(id);
    if (!existing) return undefined;
    const updated: CarbonMarket = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.carbonMarketsMap.set(id, updated);
    return updated;
  }

  async deleteCarbonMarket(id: number): Promise<boolean> {
    return this.carbonMarketsMap.delete(id);
  }

  // ─── C2050 Streams ──────────────────────────────

  async listC2050Streams(): Promise<C2050Stream[]> {
    return Array.from(this.c2050StreamsMap.values());
  }

  async getC2050Stream(id: number): Promise<C2050Stream | undefined> {
    return this.c2050StreamsMap.get(id);
  }

  async updateC2050Stream(id: number, data: Partial<InsertC2050Stream>): Promise<C2050Stream | undefined> {
    const existing = this.c2050StreamsMap.get(id);
    if (!existing) return undefined;
    const updated: C2050Stream = { ...existing, ...data, id: existing.id, updatedAt: this.now() };
    this.c2050StreamsMap.set(id, updated);
    return updated;
  }

  // ─── Regulatory Updates ─────────────────────────

  async listRegulatoryUpdates(): Promise<RegulatoryUpdate[]> {
    return Array.from(this.regulatoryMap.values());
  }

  async getRegulatoryUpdate(id: number): Promise<RegulatoryUpdate | undefined> {
    return this.regulatoryMap.get(id);
  }

  async createRegulatoryUpdate(data: InsertRegulatoryUpdate): Promise<RegulatoryUpdate> {
    const id = this.getId("regulatory");
    const entry: RegulatoryUpdate = {
      id,
      title: data.title,
      jurisdiction: data.jurisdiction ?? "",
      category: data.category ?? "",
      date: data.date ?? "",
      summary: data.summary ?? "",
      impact: data.impact ?? "medium",
      status: data.status ?? "active",
      createdAt: this.now(),
    };
    this.regulatoryMap.set(id, entry);
    return entry;
  }

  async updateRegulatoryUpdate(id: number, data: Partial<InsertRegulatoryUpdate>): Promise<RegulatoryUpdate | undefined> {
    const existing = this.regulatoryMap.get(id);
    if (!existing) return undefined;
    const updated: RegulatoryUpdate = { ...existing, ...data, id: existing.id };
    this.regulatoryMap.set(id, updated);
    return updated;
  }

  async deleteRegulatoryUpdate(id: number): Promise<boolean> {
    return this.regulatoryMap.delete(id);
  }

  // ─── System Status ──────────────────────────────

  async listSystemStatus(): Promise<SystemStatus[]> {
    return Array.from(this.systemStatusMap.values());
  }

  async getSystemStatus(id: number): Promise<SystemStatus | undefined> {
    return this.systemStatusMap.get(id);
  }

  async updateSystemStatus(id: number, data: Partial<InsertSystemStatus>): Promise<SystemStatus | undefined> {
    const existing = this.systemStatusMap.get(id);
    if (!existing) return undefined;
    const updated: SystemStatus = { ...existing, ...data, id: existing.id, lastChecked: this.now() };
    this.systemStatusMap.set(id, updated);
    return updated;
  }

  // ─── Change Log ─────────────────────────────────

  async listChangeLog(limit: number = 50): Promise<ChangeLogEntry[]> {
    const entries = Array.from(this.changeLogMap.values());
    entries.sort((a, b) => {
      const ta = a.createdAt ? a.createdAt.getTime() : 0;
      const tb = b.createdAt ? b.createdAt.getTime() : 0;
      return tb - ta;
    });
    return entries.slice(0, limit);
  }

  async logChange(action: string, section: string, detail: string, userName: string = "system"): Promise<ChangeLogEntry> {
    const id = this.getId("changeLog");
    const entry: ChangeLogEntry = { id, action, section, detail, userName, createdAt: this.now() };
    this.changeLogMap.set(id, entry);
    return entry;
  }

  // ─── Approval Queue ─────────────────────────────

  async listApprovals(): Promise<Approval[]> {
    return Array.from(this.approvalMap.values());
  }

  async getApproval(id: number): Promise<Approval | undefined> {
    return this.approvalMap.get(id);
  }

  async createApproval(data: InsertApproval): Promise<Approval> {
    const id = this.getId("approvals");
    const approval: Approval = {
      id,
      title: data.title,
      type: data.type ?? "",
      submittedBy: data.submittedBy ?? "",
      detail: data.detail ?? "",
      priority: data.priority ?? "normal",
      status: data.status ?? "pending",
      resolvedBy: data.resolvedBy ?? null,
      createdAt: this.now(),
      resolvedAt: null,
    };
    this.approvalMap.set(id, approval);
    return approval;
  }

  async updateApproval(id: number, data: Partial<Approval>): Promise<Approval | undefined> {
    const existing = this.approvalMap.get(id);
    if (!existing) return undefined;
    const updated: Approval = { ...existing, ...data, id: existing.id };
    this.approvalMap.set(id, updated);
    return updated;
  }

  // ─── Dashboard ──────────────────────────────────

  async getDashboardStats(): Promise<Record<string, any>> {
    const allRetailers = Array.from(this.retailers.values());
    const allProducts = Array.from(this.products.values());
    const allOffers = Array.from(this.retailerProductsMap.values());
    const allDeals = Array.from(this.dealsMap.values());
    const allCountries = Array.from(this.countriesMap.values());
    const allApprovals = Array.from(this.approvalMap.values());
    const allStatus = Array.from(this.systemStatusMap.values());

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

// Choose storage backend based on DATABASE_URL env var
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    console.log("[storage] Using PostgreSQL database");
    return new DatabaseStorage();
  }
  console.log("[storage] Using in-memory storage (no DATABASE_URL set)");
  return new MemStorage();
}

export const storage = createStorage();
