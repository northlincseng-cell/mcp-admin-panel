# gs master control panel (mcp)

full dynamic admin panel for managing green squares — retailers, products, gs offers, pricing, carbon markets, and more.

## tech stack
- **frontend**: react + tailwind css + shadcn/ui + recharts
- **backend**: express + drizzle orm
- **storage**: in-memory with maps + secondary indexes (production: swap for supabase/postgres)

## features
- 19 pages: dashboard, retailers, products, gs offers, deals, countries, volume tiers, gs pricing, equivalence, value protection, carbon markets, c2050 feed, regulatory updates, system status, change log, approvals, deal scoring
- per-retailer product pricing model (base gs + retailer match = total gs)
- full crud on all entities
- rate limiting (100 req/min), input validation (zod), cors, csp headers
- dark green brand theme, all lowercase text
- no personal data stored (gdpr-free by design)

## running locally
```bash
npm install
npm run dev
```

## seed data
8 retailers, 12 products, 40 retailer-product offers, 15 countries, 7 deals, and more.

## architecture notes
- **jls**: funding company
- **c2050**: verification layer (esri geospatial + legal)
- **mgs (my green squares)**: cic + ltd. owns the mcp commercial governance
- **1 gs = 100g co2e**: 75%+ transition action, max 25% offset

## previous versions
see `archive/` folder — all earlier iterations preserved.
