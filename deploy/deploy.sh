#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# PrintersRUs — Deploy / update the running application
# Run from the project root on the VPS
# ──────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pulling latest code..."
git pull origin main 2>/dev/null || echo "    (not a git repo — skipping pull)"

echo "==> Building and restarting containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Current status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Deploy complete! Site: https://printersrus.co.uk"
