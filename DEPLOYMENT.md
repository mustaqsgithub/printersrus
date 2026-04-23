# PrintersRUs — AWS EC2 + GoDaddy Domain Deployment Guide

## Architecture

```
GoDaddy DNS (printersrus.co.uk)  →  AWS EC2 (Ubuntu)
                                      ├── Nginx (reverse proxy + SSL)
                                      ├── Next.js app (Docker)
                                      └── SQLite (persistent volume)
```

**Estimated cost:** ~$9/month (EC2 t3.micro with free tier, or ~$4/month after)

---

## 1. Create an AWS Account

1. Go to **https://aws.amazon.com** and click **Create an AWS Account**
2. Enter your email, set a password, provide billing info
3. Choose the **Free Tier** — includes a `t2.micro` instance free for 12 months

---

## 2. Launch an EC2 Instance

### a) Open EC2 Dashboard

1. Log in to **AWS Console**: https://console.aws.amazon.com
2. Search for **EC2** and open it
3. Click **Launch Instance**

### b) Configure the instance

| Setting | Value |
|---|---|
| **Name** | `printersrus` |
| **AMI** | Ubuntu Server 24.04 LTS (free tier eligible) |
| **Instance type** | `t2.micro` (free tier) or `t3.small` (recommended) |
| **Key pair** | Create new → name it `printersrus-key` → download the `.pem` file |
| **Network settings** | Allow SSH (22), HTTP (80), HTTPS (443) from anywhere |
| **Storage** | 20 GB gp3 (default is fine) |

### c) Launch and note the public IP

After launch, go to **Instances** and note the **Public IPv4 address** (e.g. `3.10.45.123`).

### d) Save your key file

```bash
# Move the downloaded key to your SSH directory
mv ~/Downloads/printersrus-key.pem ~/.ssh/
chmod 400 ~/.ssh/printersrus-key.pem
```

---

## 3. Point Your GoDaddy Domain to EC2

In the **GoDaddy DNS Manager** for `printersrus.co.uk`:

| Type | Name | Value | TTL |
|---|---|---|---|
| **A** | `@` | `<your-ec2-ip>` | 600 |
| **A** | `www` | `<your-ec2-ip>` | 600 |

Replace `<your-ec2-ip>` with the public IP from step 2. DNS propagation takes 5-30 minutes.

> **Tip:** Consider attaching an **Elastic IP** in AWS so the IP doesn't change if you stop/start the instance. It's free while the instance is running.

---

## 4. Set Up the Server

### a) SSH into the instance

```bash
ssh -i ~/.ssh/printersrus-key.pem ubuntu@<your-ec2-ip>
```

### b) Run the automated setup script

From your **local machine**, copy the project files to the server:

```bash
scp -i ~/.ssh/printersrus-key.pem -r ./* ubuntu@<your-ec2-ip>:/tmp/printersrus/
```

Then on the **server**:

```bash
sudo mkdir -p /opt/printersrus
sudo cp -r /tmp/printersrus/* /opt/printersrus/
sudo chown -R ubuntu:ubuntu /opt/printersrus
cd /opt/printersrus
chmod +x deploy/setup-server.sh
sudo deploy/setup-server.sh
```

### c) Or set up manually

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
```

---

## 5. Configure Environment

```bash
cd /opt/printersrus

# Generate a secure admin setup key
cat > .env <<EOF
ADMIN_SETUP_KEY=$(openssl rand -hex 24)
EOF

# Note down the key — you'll need it later
cat .env
```

---

## 6. Build & Start the Application

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

## 7. Obtain SSL Certificate (HTTPS)

Once DNS has propagated (verify with `dig printersrus.co.uk`):

```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d printersrus.co.uk -d www.printersrus.co.uk \
  --email your-email@example.com --agree-tos --no-eff-email
```

---

## 8. Enable HTTPS in Nginx

Edit `deploy/nginx/app.conf`:

1. **Uncomment** the entire `server { listen 443 ... }` block (remove all the `#` prefixes)
2. Save the file

Reload Nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

Your site is now live at **https://printersrus.co.uk**

---

## 9. Set Up the Admin Account

Visit `https://printersrus.co.uk/admin/setup` and enter:
- Your name, email, password
- The **ADMIN_SETUP_KEY** from step 5

---

## 10. SSL Auto-Renewal

The `certbot` container automatically renews certificates every 12 hours. To test:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## 11. Set Up CI/CD (GitHub Actions)

### a) Clone the repo on EC2

Replace the copied files with a proper git clone:

```bash
cd /opt
sudo rm -rf printersrus
git clone https://github.com/mustaqsgithub/printersrus.git printersrus
cp /path/to/your/.env printersrus/.env
cd printersrus
docker compose -f docker-compose.prod.yml up -d --build
```

### b) Add GitHub Secrets

Go to your repo: **Settings > Secrets and variables > Actions > New repository secret**

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP (e.g. `3.10.45.123`) |
| `EC2_SSH_KEY` | Contents of `~/.ssh/printersrus-key.pem` |

### c) How it works

```
Push to main       → CI (tests) → CD (SSH into EC2 → git pull → docker rebuild)
Push to feature/*  → CI (tests only)
Pull request       → CI (tests only)
Manual trigger     → CD (from GitHub Actions tab)
```

---

## Ongoing Operations

### Deploy updates

Automatic via CI/CD on push to `main`. To deploy manually:
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

### AWS tips
- **Elastic IP**: Attach one to keep the IP fixed across stop/start cycles (free while instance runs)
- **Security Group**: Only ports 22, 80, 443 should be open
- **Monitoring**: Use CloudWatch for CPU/memory alerts (free basic monitoring)
- **Backups**: Enable EC2 automated snapshots for disaster recovery

---

## File Structure

```
.github/
└── workflows/
    ├── ci.yml                # CI — runs tests on push & PR
    └── deploy.yml            # CD — deploys to EC2 on push to main
deploy/
├── nginx/
│   └── app.conf              # Nginx reverse proxy config
├── setup-server.sh           # First-time server setup script
└── deploy.sh                 # Redeploy / update script
docker-compose.prod.yml       # Production compose (app + nginx + certbot)
Dockerfile                    # Docker build for the Next.js app
DEPLOYMENT.md                 # This file
```

---

## Cost Summary (AWS)

| Resource | Cost |
|---|---|
| EC2 t2.micro (free tier, 12 months) | $0/month |
| EC2 t3.micro (after free tier) | ~$9/month |
| EBS storage (20 GB gp3) | ~$1.60/month |
| Elastic IP | free (while instance runs) |
| SSL certificate | free (Let's Encrypt) |
| Data transfer (first 100 GB/month) | free |
| GoDaddy domain | already owned |
| **Total (free tier)** | **~$1.60/month** |
| **Total (after free tier)** | **~$11/month** |
