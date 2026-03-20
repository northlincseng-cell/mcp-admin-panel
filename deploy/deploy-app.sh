#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  MCP Admin Panel — App Deployment
#  Run as the 'mcp' user after setup-server.sh
#  Usage: sudo -u mcp bash deploy-app.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="/home/mcp/mcp-admin-panel"
REPO="https://github.com/northlincseng-cell/mcp-admin-panel.git"

echo "═══════════════════════════════════════════════════"
echo "  MCP Admin Panel — App Deployment"
echo "═══════════════════════════════════════════════════"

# ── Check DATABASE_URL ────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "  ERROR: DATABASE_URL not set."
  echo "  Run: export DATABASE_URL='postgresql://mcp_app:PASSWORD@localhost:5432/mcp_admin'"
  echo "  (Check /root/.mcp-credentials for the password)"
  exit 1
fi

# ── 1. Clone or pull ──────────────────────────────────
echo ""
echo "[1/6] Getting latest code..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 2. Install dependencies ──────────────────────────
echo ""
echo "[2/6] Installing dependencies..."
npm ci --production=false

# ── 3. Push database schema ──────────────────────────
echo ""
echo "[3/6] Pushing database schema..."
npx drizzle-kit push --force

# ── 4. Seed the database ─────────────────────────────
echo ""
echo "[4/6] Running auth migration..."
npx tsx server/migrate-auth.ts
echo "  Auth migration complete"

# ── 5. Build production bundle ────────────────────────
echo ""
echo "[5/6] Building production bundle..."
npm run build
echo "  Build complete"

# ── Create environment file ──────────────────────────
cat > "$APP_DIR/.env" <<ENV
DATABASE_URL=$DATABASE_URL
NODE_ENV=production
PORT=5000
SESSION_SECRET=mcp-gs-admin-$(openssl rand -hex 16)
ENV
chmod 600 "$APP_DIR/.env"

# ── Start with PM2 ───────────────────────────────────
echo ""
echo "Starting application with PM2..."
cd "$APP_DIR"

# Stop existing instance if running
pm2 delete mcp-admin 2>/dev/null || true

# Start with ecosystem config
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deployment Complete"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  App running at: http://localhost:5000"
echo "  PM2 status: pm2 status"
echo "  PM2 logs:   pm2 logs mcp-admin"
echo "  PM2 restart: pm2 restart mcp-admin"
echo ""
