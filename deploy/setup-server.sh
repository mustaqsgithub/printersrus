#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# PrintersRUs — AWS EC2 first-time server setup
# Run with sudo on a fresh Ubuntu 22.04+ instance
# ──────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="printersrus.co.uk"
APP_DIR="/opt/printersrus"
REPO_URL="https://github.com/mustaqsgithub/printersrus.git"

echo "==> Updating system packages..."
apt-get update && apt-get upgrade -y

echo "==> Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Enabling Docker to start on boot..."
systemctl enable docker
systemctl start docker

# Allow the ubuntu user to run Docker without sudo
usermod -aG docker ubuntu 2>/dev/null || true

echo "==> Setting up firewall (UFW)..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo "==> Creating application directory..."
mkdir -p "$APP_DIR"

if [ -n "$REPO_URL" ]; then
  echo "==> Cloning repository..."
  apt-get install -y git
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> No REPO_URL set. Copy your project files to $APP_DIR manually:"
  echo "    scp -i ~/.ssh/printersrus-key.pem -r ./* ubuntu@<your-ec2-ip>:$APP_DIR/"
fi

echo "==> Creating production .env file..."
if [ ! -f "$APP_DIR/.env" ]; then
  GENERATED_KEY=$(openssl rand -hex 24)
  cat > "$APP_DIR/.env" <<EOF
ADMIN_SETUP_KEY=$GENERATED_KEY
EOF
  echo "    Generated ADMIN_SETUP_KEY: $GENERATED_KEY"
  echo "    (save this — you'll need it for /admin/setup)"
fi

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Copy project files to $APP_DIR (if not using git)"
echo "  2. cd $APP_DIR"
echo "  3. Review .env file and set ADMIN_SETUP_KEY"
echo "  4. Start the app:  docker compose -f docker-compose.prod.yml up -d --build"
echo "  5. Obtain SSL certificate (see DEPLOYMENT.md)"
echo "  6. Enable HTTPS in deploy/nginx/app.conf"
echo "  7. Reload:  docker compose -f docker-compose.prod.yml restart nginx"
echo ""
