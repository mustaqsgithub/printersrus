# PrintersRUs — GoDaddy VPS Deployment Guide

## 1. Purchase a GoDaddy VPS

Go to **GoDaddy > Hosting > VPS** and choose:

| Spec | Minimum | Recommended |
|---|---|---|
| OS | **Ubuntu 22.04 LTS** | Ubuntu 22.04 LTS |
| RAM | 2 GB | 4 GB |
| CPU | 1 vCPU | 2 vCPU |
| Storage | 40 GB SSD | 80 GB SSD |
| Plan | Standard VPS (~$10/mo) | High Performance VPS |

> **Important:** Choose **Self-Managed Linux VPS** (not WordPress or cPanel hosting).

After purchase you'll receive:
- **Server IP address** (e.g. `192.0.2.10`)
- **Root SSH credentials**

---

## 2. Point Your Domain to the VPS

In **GoDaddy DNS Manager** for `printersrus.co.uk`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | `<your-vps-ip>` | 600 |
| A | www | `<your-vps-ip>` | 600 |

Replace `<your-vps-ip>` with the IP from step 1. DNS changes take 5-30 minutes to propagate.

---

## 3. Set Up the Server

SSH into your VPS:

```bash
ssh root@<your-vps-ip>
```

### Option A: Automated setup

Upload and run the setup script:

```bash
# From your local machine
scp -r ./* root@<your-vps-ip>:/opt/printersrus/

# On the VPS
chmod +x /opt/printersrus/deploy/setup-server.sh
/opt/printersrus/deploy/setup-server.sh
```

### Option B: Manual setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

# Copy project
mkdir -p /opt/printersrus
```

Then from your local machine:
```bash
scp -r ./* root@<your-vps-ip>:/opt/printersrus/
```

---

## 4. Configure Environment

On the VPS, create the `.env` file:

```bash
cd /opt/printersrus
cat > .env <<EOF
ADMIN_SETUP_KEY=$(openssl rand -hex 24)
EOF
cat .env   # note down the ADMIN_SETUP_KEY
```

---

## 5. Build & Start the Application

```bash
cd /opt/printersrus
docker compose -f docker-compose.prod.yml up -d --build
```

Verify it's running:
```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://localhost
```

---

## 6. Obtain SSL Certificate (HTTPS)

Once DNS has propagated (verify with `dig printersrus.co.uk`):

```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d printersrus.co.uk -d www.printersrus.co.uk \
  --email your-email@example.com --agree-tos --no-eff-email
```

---

## 7. Enable HTTPS in Nginx

Edit `deploy/nginx/app.conf`:

1. **Uncomment** the entire `server { listen 443 ... }` block (remove the `#` prefixes)
2. Save the file

Reload Nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

Your site is now live at **https://printersrus.co.uk**

---

## 8. Set Up the Admin Account

Visit `https://printersrus.co.uk/admin/setup` and enter:
- Your name, email, password
- The **ADMIN_SETUP_KEY** from step 4

---

## 9. SSL Auto-Renewal

The `certbot` container automatically renews certificates every 12 hours (no action needed). To test renewal manually:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## 10. Set Up CI/CD (GitHub Actions)

The project includes two workflows:

- **CI** (`.github/workflows/ci.yml`) — runs smoke + integration tests on every push and PR
- **CD** (`.github/workflows/deploy.yml`) — tests then auto-deploys to production on push to `main`

### a) Clone the repo on the VPS

On the VPS, replace the scp'd files with a proper git clone so the CD pipeline can `git pull`:

```bash
cd /opt
rm -rf printersrus
git clone git@github.com:<your-username>/printers-e-commerce.git printersrus
cp /path/to/your/.env printersrus/.env
docker compose -f printersrus/docker-compose.prod.yml up -d --build
```

### b) Generate an SSH deploy key

On your **local machine**:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/printersrus_deploy -N ""
```

Then:
- Copy the **public** key to your VPS:
  ```bash
  ssh-copy-id -i ~/.ssh/printersrus_deploy.pub root@<your-vps-ip>
  ```
- Copy the **private** key content — you'll paste it into GitHub in the next step:
  ```bash
  cat ~/.ssh/printersrus_deploy
  ```

### c) Add GitHub Secrets

Go to your repo on GitHub: **Settings > Secrets and variables > Actions > New repository secret**

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP address (e.g. `192.0.2.10`) |
| `VPS_USER` | `root` (or your deploy user) |
| `VPS_SSH_KEY` | Contents of `~/.ssh/printersrus_deploy` (the private key) |

### d) Create a GitHub Environment

Go to **Settings > Environments > New environment**, name it `production`. Optionally add:
- **Required reviewers** — for manual approval before deploy
- **Wait timer** — delay before deploy starts

### e) How it works

```
Push to main → CI (tests) → CD (SSH into VPS → git pull → docker rebuild)
Push to feature/* → CI (tests only)
Pull request → CI (tests only)
```

You can also trigger a deploy manually from the **Actions** tab using "Run workflow".

---

## Ongoing Operations

### Deploy updates

Automatic via CI/CD on push to `main`. To deploy manually on the VPS:
```bash
cd /opt/printersrus
./deploy/deploy.sh
```

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f          # all services
docker compose -f docker-compose.prod.yml logs -f web       # app only
docker compose -f docker-compose.prod.yml logs -f nginx     # nginx only
```

### Restart
```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop
```bash
docker compose -f docker-compose.prod.yml down
```

### Database backup
```bash
docker cp printersrus-web:/app/data/printers.db ./backup-$(date +%Y%m%d).db
```

---

## File Structure

```
.github/
└── workflows/
    ├── ci.yml                # CI — runs tests on push & PR
    └── deploy.yml            # CD — deploys to VPS on push to main
deploy/
├── nginx/
│   └── app.conf              # Nginx reverse proxy config
├── setup-server.sh           # First-time VPS setup script
└── deploy.sh                 # Redeploy / update script
docker-compose.prod.yml       # Production compose (app + nginx + certbot)
DEPLOYMENT.md                 # This file
```
