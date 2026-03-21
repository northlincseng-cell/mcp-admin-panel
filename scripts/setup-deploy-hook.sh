#!/bin/bash
# ═══════════════════════════════════════════════════
#  mcp deploy hook — setup script for vps
# ═══════════════════════════════════════════════════
#
# usage: bash scripts/setup-deploy-hook.sh
#
# this script:
#   1. installs pm2 globally if not present
#   2. starts the deploy hook as a pm2 process
#   3. configures pm2 to survive reboots
#
# environment variables (set in .env or export before running):
#   DEPLOY_PORT   — port for the webhook (default: 9000)
#   DEPLOY_SECRET — shared secret for authentication (recommended)
#   PROJECT_DIR   — project root (default: current directory)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."

echo "═══════════════════════════════════════════════"
echo "  mcp deploy hook setup"
echo "═══════════════════════════════════════════════"

# check node
if ! command -v node &> /dev/null; then
  echo "error: node.js is not installed"
  exit 1
fi

# check/install pm2
if ! command -v pm2 &> /dev/null; then
  echo "installing pm2 globally..."
  npm install -g pm2
fi

# check/install tsx
if ! command -v tsx &> /dev/null; then
  echo "installing tsx globally..."
  npm install -g tsx
fi

# load .env if present
if [ -f "${PROJECT_DIR}/.env" ]; then
  echo "loading .env..."
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

export PROJECT_DIR="${PROJECT_DIR}"

# stop existing instance if running
pm2 delete mcp-deploy-hook 2>/dev/null || true

# start deploy hook
echo "starting deploy hook..."
pm2 start tsx \
  --name mcp-deploy-hook \
  --cwd "${PROJECT_DIR}" \
  -- server/deploy-hook.ts

# save pm2 config and setup startup
pm2 save
pm2 startup 2>/dev/null || echo "run the pm2 startup command above as root if needed"

echo ""
echo "═══════════════════════════════════════════════"
echo "  deploy hook is running"
echo "═══════════════════════════════════════════════"
echo ""
echo "  endpoint:  http://localhost:${DEPLOY_PORT:-9000}/deploy"
echo "  health:    http://localhost:${DEPLOY_PORT:-9000}/health"
echo "  logs:      pm2 logs mcp-deploy-hook"
echo ""
echo "  to trigger a deploy:"
echo "    curl -X POST http://your-server:${DEPLOY_PORT:-9000}/deploy \\"
if [ -n "${DEPLOY_SECRET:-}" ]; then
  echo "      -H 'Content-Type: application/json' \\"
  echo "      -d '{\"secret\": \"***\"}'"
else
  echo "      -H 'Content-Type: application/json' \\"
  echo "      -d '{}'"
  echo ""
  echo "  ⚠ warning: no DEPLOY_SECRET set — set one in .env for security"
fi
echo ""
