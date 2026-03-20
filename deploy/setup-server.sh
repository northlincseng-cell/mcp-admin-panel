#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  MCP Admin Panel — Hostinger KVM 2 Server Setup
#  Run as root on a fresh Ubuntu 22.04 VPS
#  Usage: sudo bash setup-server.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="bmcewan.info"
APP_USER="mcp"
APP_DIR="/home/$APP_USER/mcp-admin-panel"
DB_NAME="mcp_admin"
DB_USER="mcp_app"

echo "═══════════════════════════════════════════════════"
echo "  MCP Admin Panel — Server Setup"
echo "  Domain: $DOMAIN"
echo "═══════════════════════════════════════════════════"

# ── 1. System updates ────────────────────────────────
echo ""
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20 LTS ────────────────────────
echo ""
echo "[2/8] Installing Node.js 20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "  Node.js $(node -v) installed"
echo "  npm $(npm -v) installed"

# ── 3. Install PostgreSQL 16 ─────────────────────────
echo ""
echo "[3/8] Installing PostgreSQL 16..."
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
  apt update
  apt install -y postgresql-16 postgresql-client-16
fi
systemctl enable postgresql
systemctl start postgresql
echo "  PostgreSQL $(psql --version | awk '{print $3}') installed"

# ── 4. Create database and user ──────────────────────
echo ""
echo "[4/8] Setting up database..."
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOSQL

echo "  Database '$DB_NAME' ready"
echo "  User '$DB_USER' configured"

# ── 5. Create app user ───────────────────────────────
echo ""
echo "[5/8] Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi

# ── 6. Install Nginx ─────────────────────────────────
echo ""
echo "[6/8] Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# Write Nginx config
cat > /etc/nginx/sites-available/mcp-admin <<'NGINX_CONF'
server {
    listen 80;
    server_name bmcewan.info www.bmcewan.info;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/mcp-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  Nginx configured for $DOMAIN"

# ── 7. Install PM2 ───────────────────────────────────
echo ""
echo "[7/8] Installing PM2 process manager..."
npm install -g pm2
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || true
echo "  PM2 installed"

# ── 8. Install Certbot for SSL ────────────────────────
echo ""
echo "[8/8] Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx
echo "  Certbot installed (run SSL setup after DNS is pointed)"

# ── Save credentials ─────────────────────────────────
CRED_FILE="/root/.mcp-credentials"
cat > "$CRED_FILE" <<CREDS
# MCP Admin Panel — Database Credentials
# Generated: $(date -u +"%Y-%m-%d %H:%M UTC")
# KEEP THIS FILE SECURE — delete after noting credentials

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
CREDS
chmod 600 "$CRED_FILE"

# ── Summary ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Setup Complete"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Database credentials saved to: $CRED_FILE"
echo "  DATABASE_URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "  Next steps:"
echo "  1. Clone the repo and deploy the app (run deploy-app.sh)"
echo "  2. Point DNS A records to this server's IP"
echo "  3. Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
