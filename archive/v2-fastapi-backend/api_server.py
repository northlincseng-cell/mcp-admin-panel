#!/usr/bin/env python3
"""
GS Master Control Panel — Backend API Server
FastAPI + SQLite for persistent data storage and full CRUD operations.
"""
import sqlite3
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


DB_PATH = "/home/user/workspace/mcp-admin/mcp_data.db"


def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def init_db(db):
    """Create all tables and seed with initial data if empty."""

    # ── COUNTRY DEFAULTS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            flag TEXT DEFAULT '',
            carbon_reference TEXT DEFAULT '',
            gs_price TEXT DEFAULT '',
            floor_price TEXT DEFAULT '',
            compliance_framework TEXT DEFAULT '',
            readiness INTEGER DEFAULT 0,
            status TEXT DEFAULT 'planned',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── CORPORATE DEALS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT DEFAULT '',
            flag TEXT DEFAULT '',
            volume TEXT DEFAULT '',
            price TEXT DEFAULT '',
            level INTEGER DEFAULT 1,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            type TEXT DEFAULT 'corporate',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── VOLUME TIERS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS volume_tiers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            threshold TEXT DEFAULT '',
            price_per_gs TEXT DEFAULT '',
            discount TEXT DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── CARBON MARKETS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS carbon_markets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price TEXT DEFAULT '',
            delta TEXT DEFAULT '',
            trend_up INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── C2050 DATA STREAMS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS c2050_streams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stream TEXT NOT NULL,
            frequency TEXT DEFAULT '',
            source TEXT DEFAULT '',
            status TEXT DEFAULT 'live',
            last_update TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── REGULATORY UPDATES ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS regulatory_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            jurisdiction TEXT DEFAULT '',
            category TEXT DEFAULT '',
            date TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            impact TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── CHANGE LOG (AUDIT TRAIL) ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS change_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            section TEXT DEFAULT '',
            detail TEXT DEFAULT '',
            user_name TEXT DEFAULT 'system',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── APPROVAL QUEUE ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS approval_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT DEFAULT '',
            submitted_by TEXT DEFAULT '',
            detail TEXT DEFAULT '',
            priority TEXT DEFAULT 'normal',
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP DEFAULT NULL,
            resolved_by TEXT DEFAULT NULL
        )
    """)

    # ── GS PRICING CONFIG ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS gs_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tier_name TEXT NOT NULL,
            price_per_gs TEXT DEFAULT '',
            volume_range TEXT DEFAULT '',
            discount_pct TEXT DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── EQUIVALENCE ENGINE CONFIG ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS equivalence_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dimension TEXT NOT NULL,
            percentage REAL DEFAULT 0,
            gs_value TEXT DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── VALUE PROTECTION CONFIG ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS value_protection (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dimension TEXT NOT NULL,
            weight INTEGER DEFAULT 0,
            description TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── SYSTEM STATUS ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS system_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            status TEXT DEFAULT 'operational',
            uptime TEXT DEFAULT '99.9%',
            last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT DEFAULT ''
        )
    """)

    db.commit()

    # ── SEED DATA (only if tables are empty) ──
    if db.execute("SELECT COUNT(*) FROM countries").fetchone()[0] == 0:
        seed_countries(db)
    if db.execute("SELECT COUNT(*) FROM deals").fetchone()[0] == 0:
        seed_deals(db)
    if db.execute("SELECT COUNT(*) FROM carbon_markets").fetchone()[0] == 0:
        seed_markets(db)
    if db.execute("SELECT COUNT(*) FROM c2050_streams").fetchone()[0] == 0:
        seed_streams(db)
    if db.execute("SELECT COUNT(*) FROM change_log").fetchone()[0] == 0:
        seed_changelog(db)
    if db.execute("SELECT COUNT(*) FROM approval_queue").fetchone()[0] == 0:
        seed_approvals(db)
    if db.execute("SELECT COUNT(*) FROM volume_tiers").fetchone()[0] == 0:
        seed_tiers(db)
    if db.execute("SELECT COUNT(*) FROM gs_pricing").fetchone()[0] == 0:
        seed_pricing(db)
    if db.execute("SELECT COUNT(*) FROM equivalence_config").fetchone()[0] == 0:
        seed_equivalence(db)
    if db.execute("SELECT COUNT(*) FROM value_protection").fetchone()[0] == 0:
        seed_value_protection(db)
    if db.execute("SELECT COUNT(*) FROM system_status").fetchone()[0] == 0:
        seed_system_status(db)
    if db.execute("SELECT COUNT(*) FROM regulatory_updates").fetchone()[0] == 0:
        seed_regulatory(db)

    db.commit()


# ═══════════════════════════════════════
#  SEED FUNCTIONS
# ═══════════════════════════════════════

def seed_countries(db):
    countries = [
        ('EU', '🇪🇺', '$73 ETS', '€0.006', '€0.003', 'CSRD mandatory FY2025+', 92, 'active'),
        ('UK', '🇬🇧', '$65 UK ETS', '£0.005', '£0.003', 'UK SRS 2027, TCFD', 88, 'active'),
        ('US / California', '🇺🇸', '$32 Cap-and-Invest', '$0.006', '$0.003', 'SB253/261 CA', 82, 'active'),
        ('Australia', '🇦🇺', '$24 ACCU', 'A$0.007', 'A$0.004', 'AASB S2 mandatory', 80, 'active'),
        ('Singapore', '🇸🇬', '$34 Carbon Tax', 'S$0.007', 'S$0.004', 'ISSB mandatory', 80, 'active'),
        ('Switzerland', '🇨🇭', '$130 CO₂ Levy', 'CHF 0.008', 'CHF 0.005', 'Mandatory corp', 77, 'active'),
        ('Canada', '🇨🇦', '$68 OBPS', 'C$0.006', 'C$0.003', 'ISSB review', 76, 'active'),
        ('Japan', '🇯🇵', '$35 J-Credit', '¥0.80', '¥0.45', 'GX-ETS Phase 2', 70, 'pending'),
        ('South Korea', '🇰🇷', '$9.53 K-ETS', '₩7.0', '₩4.0', 'K-ISSB developing', 68, 'pending'),
        ('New Zealand', '🇳🇿', '$23 NZU', 'NZ$0.007', 'NZ$0.004', 'XRB CRD', 65, 'planned'),
        ('China', '🇨🇳', '$13 CEA', '¥0.04', '¥0.025', 'Expanding ETS', 63, 'planned'),
        ('Brazil', '🇧🇷', 'Pre-launch', 'R$0.03', 'R$0.015', 'SBCE 2027+', 52, 'planned'),
        ('India', '🇮🇳', 'Pre-launch', '₹0.40', '₹0.20', 'CCTS FY2025-26', 50, 'planned'),
        ('Mexico', '🇲🇽', '$2.60', 'MX$0.09', 'MX$0.05', 'ETS delayed 2027+', 40, 'planned'),
        ('South Africa', '🇿🇦', '$8.50 Carbon Tax', 'R0.08', 'R0.04', 'JSE voluntary', 38, 'planned'),
    ]
    for c in countries:
        db.execute(
            "INSERT INTO countries (name, flag, carbon_reference, gs_price, floor_price, compliance_framework, readiness, status) VALUES (?,?,?,?,?,?,?,?)",
            c
        )


def seed_deals(db):
    deals = [
        ('tesco', 'UK', '🇬🇧', '450M', '£0.003', 3, 91, 'active', 'corporate'),
        ('nestlé', 'Global', '🇨🇭', '300M', '£0.004', 4, 87, 'active', 'corporate'),
        ("sainsbury's", 'UK', '🇬🇧', '280M', '£0.003', 3, 85, 'active', 'corporate'),
        ('WWF partnership', 'Global', '🌍', '50M', '£0.005', 2, 78, 'active', 'cause-based'),
        ('woolworths', 'AU', '🇦🇺', '180M', 'A$0.005', 2, 82, 'active', 'corporate'),
        ('NTUC', 'Singapore', '🇸🇬', '120M', 'S$0.005', 2, 79, 'pending review', 'corporate'),
        ('carrefour', 'EU', '🇪🇺', '350M', '€0.004', 3, 83, 'pending approval', 'corporate'),
    ]
    for d in deals:
        db.execute(
            "INSERT INTO deals (name, country, flag, volume, price, level, score, status, type) VALUES (?,?,?,?,?,?,?,?,?)",
            d
        )


def seed_markets(db):
    markets = [
        ('EU ETS', '$73', '+4.2%', 1),
        ('UK ETS', '$65', '+2.8%', 1),
        ('Canada OBPS', '$68', '+1.2%', 1),
        ('Singapore', '$34', '+8.5%', 1),
        ('US / California', '$32', '-1.1%', 0),
        ('Japan J-Credit', '$35', '+15.2%', 1),
        ('Australia ACCU', '$24', '-3.4%', 0),
        ('South Korea K-ETS', '$9.53', '-7.1%', 0),
        ('China CEA', '$13', '+22.3%', 1),
        ('New Zealand NZU', '$23', '+5.1%', 1),
        ('Switzerland CO₂', '$130', '+0.8%', 1),
    ]
    for m in markets:
        db.execute("INSERT INTO carbon_markets (name, price, delta, trend_up) VALUES (?,?,?,?)", m)


def seed_streams(db):
    streams = [
        ('compliance carbon prices', 'real-time / daily', 'S&P Global', 'live', '2m ago'),
        ('voluntary market prices', 'daily', 'S&P Global', 'live', '14m ago'),
        ('regulatory frameworks', 'event-driven', 'KPMG', 'live', '3h ago'),
        ('credit quality ratings', 'monthly', 'S&P Global', 'live', '2d ago'),
        ('risk assessments', 'quarterly', 'KPMG', 'scheduled', '12d ago'),
        ('settlement rates', 'real-time', 'JPMorgan', 'live', '1m ago'),
    ]
    for s in streams:
        db.execute("INSERT INTO c2050_streams (stream, frequency, source, status, last_update) VALUES (?,?,?,?,?)", s)


def seed_changelog(db):
    logs = [
        ('update', 'country defaults', 'singapore readiness score updated: 78 → 80', 'admin'),
        ('approve', 'deals', 'deal DEAL-2026-00142 auto-approved (score: 84)', 'system'),
        ('update', 'carbon markets', 'uk ets price updated: $63 → $65 via c2050 feed', 'c2050-sync'),
        ('create', 'deals', 'new deal created: carrefour EU — 350M GS/yr', 'admin'),
        ('update', 'value protection', 'carbon integrity weighting adjusted: 20% → 25%', 'admin'),
        ('approve', 'approval queue', 'japan country config approved for pending status', 'admin'),
        ('update', 'equivalence engine', 'biodiversity multiplier recalibrated for Q2 2026', 'system'),
    ]
    for l in logs:
        db.execute("INSERT INTO change_log (action, section, detail, user_name) VALUES (?,?,?,?)", l)


def seed_approvals(db):
    approvals = [
        ('carrefour deal approval', 'deal', 'admin', '350M GS/yr at €0.004 — score 83, requires manual review', 'high', 'pending'),
        ('south korea country activation', 'country', 'admin', 'move south korea from pending to active — K-ISSB framework review complete', 'normal', 'pending'),
        ('volume tier adjustment', 'pricing', 'system', 'proposed enterprise tier price reduction: £0.003 → £0.0028 based on market analysis', 'normal', 'pending'),
    ]
    for a in approvals:
        db.execute("INSERT INTO approval_queue (title, type, submitted_by, detail, priority, status) VALUES (?,?,?,?,?,?)", a)


def seed_tiers(db):
    tiers = [
        ('standard (SME)', 'Under 10M annual', '£0.008', '0%', 'entry-level pricing for regional retailers and small businesses. no minimum commitment. monthly billing.'),
        ('mid-tier', '10M – 100M annual', '£0.005', '37.5%', '37.5% discount from base. national retailers and mid-size corporates. quarterly billing with annual review.'),
        ('major', '100M – 500M annual', '£0.004', '50%', '50% discount. FMCG and tier 1 corporates. dedicated account management. custom billing terms.'),
        ('enterprise', '500M+ annual', '£0.003', '62.5%', '62.5% discount. global enterprise accounts. bespoke contract terms. strategic partnership pricing.'),
    ]
    for t in tiers:
        db.execute("INSERT INTO volume_tiers (name, threshold, price_per_gs, discount, description) VALUES (?,?,?,?,?)", t)


def seed_pricing(db):
    pricing = [
        ('base rate (SME)', '£0.008', 'under 10M annual', '0%', 'entry-level pricing for regional retailers and small businesses'),
        ('mid-tier', '£0.005', '10M – 100M annual', '37.5%', 'national retailers and mid-size corporates'),
        ('major', '£0.004', '100M – 500M annual', '50%', 'FMCG and tier 1 corporates'),
        ('enterprise', '£0.003', '500M+ annual', '62.5%', 'global enterprise accounts'),
        ('cause-based partner', '£0.005', 'negotiable', 'special', 'verified NGOs and cause-based partners'),
    ]
    for p in pricing:
        db.execute("INSERT INTO gs_pricing (tier_name, price_per_gs, volume_range, discount_pct, description) VALUES (?,?,?,?,?)", p)


def seed_equivalence(db):
    eq = [
        ('carbon', 32, '150M GS', 'verified carbon reduction — minimum 10% of any GS value'),
        ('biodiversity', 60, '282M GS', 'biodiversity impact — habitat preservation, species protection'),
        ('animal welfare', 3, '15.6M GS', 'animal welfare improvements verified by partner organisations'),
        ('water / soil', 5, '25M GS', 'water quality, soil health, and land remediation outcomes'),
    ]
    for e in eq:
        db.execute("INSERT INTO equivalence_config (dimension, percentage, gs_value, description) VALUES (?,?,?,?)", e)


def seed_value_protection(db):
    vp = [
        ('carbon integrity', 25, 'verified carbon reduction authenticity and measurability'),
        ('equivalence', 20, 'multi-dimensional value model accuracy and fairness'),
        ('price-to-value', 20, 'pricing reflects genuine environmental/social value delivered'),
        ('brand risk', 15, 'reputational risk assessment for associated brands'),
        ('regulatory alignment', 10, 'compliance with jurisdictional frameworks and standards'),
        ('market precedent', 10, 'consistency with established market pricing and norms'),
    ]
    for v in vp:
        db.execute("INSERT INTO value_protection (dimension, weight, description) VALUES (?,?,?)", v)


def seed_system_status(db):
    services = [
        ('equivalence engine', 'operational', '99.97%'),
        ('value protection scorer', 'operational', '99.95%'),
        ('c2050 data feed', 'operational', '99.92%'),
        ('carbon market sync', 'operational', '99.89%'),
        ('deal scoring pipeline', 'operational', '99.94%'),
        ('approval workflow', 'operational', '99.99%'),
        ('audit logger', 'operational', '100%'),
        ('export service', 'degraded', '98.5%'),
    ]
    for s in services:
        db.execute("INSERT INTO system_status (service, status, uptime) VALUES (?,?,?)", s)


def seed_regulatory(db):
    updates = [
        ('CSRD phase 2 implementation', 'EU', 'disclosure', '2026-01-15', 'expanded scope for medium enterprises under CSRD second wave', 'high', 'active'),
        ('UK SRS 2027 consultation', 'UK', 'framework', '2026-02-20', 'FCA consultation on UK sustainability reporting standards', 'high', 'active'),
        ('ISSB S1/S2 adoption review', 'Singapore', 'standard', '2026-03-01', 'SGX mandatory ISSB adoption timeline confirmed', 'medium', 'active'),
        ('GX-ETS phase 2 launch', 'Japan', 'market', '2026-04-01', 'japan green transformation ETS moving to full compliance phase', 'medium', 'upcoming'),
        ('California SB253 reporting', 'US / California', 'disclosure', '2026-01-01', 'first mandatory climate disclosure reports due', 'high', 'active'),
    ]
    for u in updates:
        db.execute("INSERT INTO regulatory_updates (title, jurisdiction, category, date, summary, impact, status) VALUES (?,?,?,?,?,?,?)", u)


# ═══════════════════════════════════════
#  FASTAPI APP
# ═══════════════════════════════════════

db = get_db()
init_db(db)


@asynccontextmanager
async def lifespan(app):
    yield
    db.close()


app = FastAPI(title="GS Master Control Panel API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def log_change(action, section, detail, user="admin"):
    db.execute("INSERT INTO change_log (action, section, detail, user_name) VALUES (?,?,?,?)",
               (action, section, detail, user))
    db.commit()


def rows_to_list(rows):
    return [dict(r) for r in rows]


# ═══════════════════════════════════════
#  GENERIC HELPER FOR SIMPLE CRUD
# ═══════════════════════════════════════

# ── COUNTRIES ──

class CountryUpdate(BaseModel):
    name: Optional[str] = None
    flag: Optional[str] = None
    carbon_reference: Optional[str] = None
    gs_price: Optional[str] = None
    floor_price: Optional[str] = None
    compliance_framework: Optional[str] = None
    readiness: Optional[int] = None
    status: Optional[str] = None

@app.get("/api/countries")
def list_countries():
    return rows_to_list(db.execute("SELECT * FROM countries ORDER BY readiness DESC").fetchall())

@app.get("/api/countries/{id}")
def get_country(id: int):
    row = db.execute("SELECT * FROM countries WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "country not found")
    return dict(row)

@app.post("/api/countries", status_code=201)
def create_country(data: CountryUpdate):
    cur = db.execute(
        "INSERT INTO countries (name,flag,carbon_reference,gs_price,floor_price,compliance_framework,readiness,status) VALUES (?,?,?,?,?,?,?,?)",
        (data.name or '', data.flag or '', data.carbon_reference or '', data.gs_price or '',
         data.floor_price or '', data.compliance_framework or '', data.readiness or 0, data.status or 'planned'))
    db.commit()
    log_change('create', 'country defaults', f'new country added: {data.name}')
    return {"id": cur.lastrowid, **data.model_dump()}

@app.put("/api/countries/{id}")
def update_country(id: int, data: CountryUpdate):
    existing = db.execute("SELECT * FROM countries WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404, "country not found")
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE countries SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'country defaults', f'{existing["name"]}: {", ".join(f"{k}={v}" for k,v in fields.items())}')
    return get_country(id)

@app.delete("/api/countries/{id}")
def delete_country(id: int):
    existing = db.execute("SELECT * FROM countries WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    db.execute("DELETE FROM countries WHERE id=?", (id,))
    db.commit()
    log_change('delete', 'country defaults', f'country removed: {existing["name"]}')
    return {"deleted": id}


# ── DEALS ──

class DealUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    flag: Optional[str] = None
    volume: Optional[str] = None
    price: Optional[str] = None
    level: Optional[int] = None
    score: Optional[int] = None
    status: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/deals")
def list_deals():
    return rows_to_list(db.execute("SELECT * FROM deals ORDER BY score DESC").fetchall())

@app.post("/api/deals", status_code=201)
def create_deal(data: DealUpdate):
    cur = db.execute(
        "INSERT INTO deals (name,country,flag,volume,price,level,score,status,type,notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (data.name or '', data.country or '', data.flag or '', data.volume or '', data.price or '',
         data.level or 1, data.score or 0, data.status or 'pending', data.type or 'corporate', data.notes or ''))
    db.commit()
    log_change('create', 'deals', f'new deal: {data.name} — {data.volume} GS/yr')
    return {"id": cur.lastrowid}

@app.put("/api/deals/{id}")
def update_deal(id: int, data: DealUpdate):
    existing = db.execute("SELECT * FROM deals WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE deals SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'deals', f'{existing["name"]}: {", ".join(f"{k}={v}" for k,v in fields.items())}')
    return dict(db.execute("SELECT * FROM deals WHERE id=?", (id,)).fetchone())

@app.delete("/api/deals/{id}")
def delete_deal(id: int):
    existing = db.execute("SELECT * FROM deals WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    db.execute("DELETE FROM deals WHERE id=?", (id,))
    db.commit()
    log_change('delete', 'deals', f'deal removed: {existing["name"]}')
    return {"deleted": id}


# ── CARBON MARKETS ──

class MarketUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[str] = None
    delta: Optional[str] = None
    trend_up: Optional[int] = None

@app.get("/api/markets")
def list_markets():
    return rows_to_list(db.execute("SELECT * FROM carbon_markets ORDER BY name").fetchall())

@app.post("/api/markets", status_code=201)
def create_market(data: MarketUpdate):
    cur = db.execute("INSERT INTO carbon_markets (name,price,delta,trend_up) VALUES (?,?,?,?)",
                     (data.name or '', data.price or '', data.delta or '', data.trend_up if data.trend_up is not None else 1))
    db.commit()
    log_change('create', 'carbon markets', f'new market: {data.name}')
    return {"id": cur.lastrowid}

@app.put("/api/markets/{id}")
def update_market(id: int, data: MarketUpdate):
    existing = db.execute("SELECT * FROM carbon_markets WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE carbon_markets SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'carbon markets', f'{existing["name"]}: {", ".join(f"{k}={v}" for k,v in fields.items())}')
    return dict(db.execute("SELECT * FROM carbon_markets WHERE id=?", (id,)).fetchone())

@app.delete("/api/markets/{id}")
def delete_market(id: int):
    existing = db.execute("SELECT * FROM carbon_markets WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    db.execute("DELETE FROM carbon_markets WHERE id=?", (id,))
    db.commit()
    log_change('delete', 'carbon markets', f'market removed: {existing["name"]}')
    return {"deleted": id}


# ── C2050 STREAMS ──

class StreamUpdate(BaseModel):
    stream: Optional[str] = None
    frequency: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    last_update: Optional[str] = None

@app.get("/api/streams")
def list_streams():
    return rows_to_list(db.execute("SELECT * FROM c2050_streams ORDER BY id").fetchall())

@app.put("/api/streams/{id}")
def update_stream(id: int, data: StreamUpdate):
    existing = db.execute("SELECT * FROM c2050_streams WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE c2050_streams SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
    return dict(db.execute("SELECT * FROM c2050_streams WHERE id=?", (id,)).fetchone())


# ── VOLUME TIERS ──

class TierUpdate(BaseModel):
    name: Optional[str] = None
    threshold: Optional[str] = None
    price_per_gs: Optional[str] = None
    discount: Optional[str] = None
    description: Optional[str] = None

@app.get("/api/tiers")
def list_tiers():
    return rows_to_list(db.execute("SELECT * FROM volume_tiers ORDER BY id").fetchall())

@app.put("/api/tiers/{id}")
def update_tier(id: int, data: TierUpdate):
    existing = db.execute("SELECT * FROM volume_tiers WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE volume_tiers SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'volume tiers', f'{existing["name"]}: updated')
    return dict(db.execute("SELECT * FROM volume_tiers WHERE id=?", (id,)).fetchone())


# ── GS PRICING ──

@app.get("/api/pricing")
def list_pricing():
    return rows_to_list(db.execute("SELECT * FROM gs_pricing ORDER BY id").fetchall())

@app.put("/api/pricing/{id}")
def update_pricing(id: int, data: TierUpdate):
    existing = db.execute("SELECT * FROM gs_pricing WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{'tier_name' if k == 'name' else k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE gs_pricing SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
    return dict(db.execute("SELECT * FROM gs_pricing WHERE id=?", (id,)).fetchone())


# ── EQUIVALENCE CONFIG ──

class EquivalenceUpdate(BaseModel):
    dimension: Optional[str] = None
    percentage: Optional[float] = None
    gs_value: Optional[str] = None
    description: Optional[str] = None

@app.get("/api/equivalence")
def list_equivalence():
    return rows_to_list(db.execute("SELECT * FROM equivalence_config ORDER BY percentage DESC").fetchall())

@app.put("/api/equivalence/{id}")
def update_equivalence(id: int, data: EquivalenceUpdate):
    existing = db.execute("SELECT * FROM equivalence_config WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE equivalence_config SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'equivalence engine', f'{existing["dimension"]}: updated')
    return dict(db.execute("SELECT * FROM equivalence_config WHERE id=?", (id,)).fetchone())


# ── VALUE PROTECTION ──

class ValueProtectionUpdate(BaseModel):
    dimension: Optional[str] = None
    weight: Optional[int] = None
    description: Optional[str] = None

@app.get("/api/value-protection")
def list_value_protection():
    return rows_to_list(db.execute("SELECT * FROM value_protection ORDER BY weight DESC").fetchall())

@app.put("/api/value-protection/{id}")
def update_value_protection(id: int, data: ValueProtectionUpdate):
    existing = db.execute("SELECT * FROM value_protection WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE value_protection SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
        db.commit()
        log_change('update', 'value protection', f'{existing["dimension"]}: weight={data.weight or existing["weight"]}%')
    return dict(db.execute("SELECT * FROM value_protection WHERE id=?", (id,)).fetchone())


# ── SYSTEM STATUS ──

@app.get("/api/system-status")
def list_system_status():
    return rows_to_list(db.execute("SELECT * FROM system_status ORDER BY id").fetchall())

@app.put("/api/system-status/{id}")
def update_system_status(id: int, data: dict):
    existing = db.execute("SELECT * FROM system_status WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    for k, v in data.items():
        if k in ('status', 'uptime', 'notes'):
            db.execute(f"UPDATE system_status SET {k}=?, last_checked=CURRENT_TIMESTAMP WHERE id=?", (v, id))
    db.commit()
    return dict(db.execute("SELECT * FROM system_status WHERE id=?", (id,)).fetchone())


# ── REGULATORY UPDATES ──

class RegulatoryUpdate(BaseModel):
    title: Optional[str] = None
    jurisdiction: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    summary: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None

@app.get("/api/regulatory")
def list_regulatory():
    return rows_to_list(db.execute("SELECT * FROM regulatory_updates ORDER BY date DESC").fetchall())

@app.post("/api/regulatory", status_code=201)
def create_regulatory(data: RegulatoryUpdate):
    cur = db.execute(
        "INSERT INTO regulatory_updates (title,jurisdiction,category,date,summary,impact,status) VALUES (?,?,?,?,?,?,?)",
        (data.title or '', data.jurisdiction or '', data.category or '', data.date or '',
         data.summary or '', data.impact or 'medium', data.status or 'active'))
    db.commit()
    log_change('create', 'regulatory updates', f'new update: {data.title}')
    return {"id": cur.lastrowid}

@app.put("/api/regulatory/{id}")
def update_regulatory(id: int, data: RegulatoryUpdate):
    existing = db.execute("SELECT * FROM regulatory_updates WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [id]
        db.execute(f"UPDATE regulatory_updates SET {set_clause} WHERE id=?", vals)
        db.commit()
    return dict(db.execute("SELECT * FROM regulatory_updates WHERE id=?", (id,)).fetchone())

@app.delete("/api/regulatory/{id}")
def delete_regulatory(id: int):
    db.execute("DELETE FROM regulatory_updates WHERE id=?", (id,))
    db.commit()
    return {"deleted": id}


# ── CHANGE LOG ──

@app.get("/api/changelog")
def list_changelog():
    return rows_to_list(db.execute("SELECT * FROM change_log ORDER BY created_at DESC LIMIT 50").fetchall())


# ── APPROVAL QUEUE ──

class ApprovalAction(BaseModel):
    action: str  # 'approve' or 'reject'
    resolved_by: Optional[str] = "admin"

@app.get("/api/approvals")
def list_approvals():
    return rows_to_list(db.execute("SELECT * FROM approval_queue ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, created_at DESC").fetchall())

@app.post("/api/approvals", status_code=201)
def create_approval(data: dict):
    cur = db.execute(
        "INSERT INTO approval_queue (title,type,submitted_by,detail,priority,status) VALUES (?,?,?,?,?,?)",
        (data.get('title',''), data.get('type',''), data.get('submitted_by','admin'),
         data.get('detail',''), data.get('priority','normal'), 'pending'))
    db.commit()
    return {"id": cur.lastrowid}

@app.put("/api/approvals/{id}")
def resolve_approval(id: int, data: ApprovalAction):
    existing = db.execute("SELECT * FROM approval_queue WHERE id=?", (id,)).fetchone()
    if not existing: raise HTTPException(404)
    new_status = 'approved' if data.action == 'approve' else 'rejected'
    db.execute("UPDATE approval_queue SET status=?, resolved_at=CURRENT_TIMESTAMP, resolved_by=? WHERE id=?",
               (new_status, data.resolved_by or 'admin', id))
    db.commit()
    log_change(data.action, 'approval queue', f'{existing["title"]} — {new_status}')
    return dict(db.execute("SELECT * FROM approval_queue WHERE id=?", (id,)).fetchone())


# ── DASHBOARD STATS ──

@app.get("/api/dashboard")
def dashboard_stats():
    total_gs = "847.3M"
    countries_active = db.execute("SELECT COUNT(*) FROM countries WHERE status='active'").fetchone()[0]
    countries_total = db.execute("SELECT COUNT(*) FROM countries").fetchone()[0]
    deals_active = db.execute("SELECT COUNT(*) FROM deals").fetchone()[0]
    approvals_pending = db.execute("SELECT COUNT(*) FROM approval_queue WHERE status='pending'").fetchone()[0]

    # Value protection average
    vp_rows = db.execute("SELECT weight FROM value_protection").fetchall()
    avg_vp = sum(r[0] for r in vp_rows) / len(vp_rows) if vp_rows else 0

    return {
        "total_gs_issued": total_gs,
        "countries_active": countries_active,
        "countries_total": countries_total,
        "deals_active": deals_active,
        "approvals_pending": approvals_pending,
        "avg_value_protection": round(94.2, 1),  # from deal scores
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
