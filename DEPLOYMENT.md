# PrintersRUs — Deployment Guide

## Hosting: Render + GoDaddy Domain

The app is hosted on **Render** (Docker-based, supports SQLite with persistent disk) with the **printersrus.co.uk** domain managed on GoDaddy.

---

## 1. Create a Render Account

1. Go to **https://render.com** and sign up (use "Sign up with GitHub" for easiest setup)
2. Connect your GitHub account when prompted

---

## 2. Deploy the App on Render

### Option A: Blueprint (recommended)

1. Go to **https://render.com/deploy**
2. Click **New Blueprint Instance**
3. Select the `mustaqsgithub/printersrus` repository
4. Render reads `render.yaml` and sets everything up automatically
5. Click **Apply** — Render will build the Docker image and deploy

### Option B: Manual setup

1. Go to **Render Dashboard > New > Web Service**
2. Connect your GitHub repo: `mustaqsgithub/printersrus`
3. Configure:
   - **Name**: `printersrus`
   - **Region**: `Frankfurt` (closest to UK)
   - **Runtime**: `Docker`
   - **Plan**: `Starter` ($7/mo — persistent disk, no cold starts)
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_BASE_URL` | `https://printersrus.co.uk` |
   | `BASE_URL` | `https://printersrus.co.uk` |
   | `COOKIE_SECURE` | `true` |
   | `NEXT_PUBLIC_STORE_NAME` | `PrintersRUs` |
   | `NEXT_PUBLIC_STORE_DESCRIPTION` | `Your one-stop shop for printers, ink & accessories` |
   | `ADMIN_SETUP_KEY` | *(click "Generate" or set your own secret)* |
5. Add **Disk**:
   - **Name**: `printersrus-data`
   - **Mount Path**: `/app/data`
   - **Size**: `1 GB`
6. Click **Create Web Service**

After the build completes (~2-3 minutes), your app will be live at `https://printersrus.onrender.com`.

---

## 3. Point Your GoDaddy Domain to Render

### a) Add your custom domain in Render

1. In the **Render dashboard**, open your `printersrus` service
2. Go to **Settings > Custom Domains**
3. Click **Add Custom Domain**
4. Add: `printersrus.co.uk`
5. Add: `www.printersrus.co.uk`
6. Render will show you the DNS records you need to create

### b) Update DNS in GoDaddy

1. Log in to **GoDaddy** > **My Products** > **DNS** for `printersrus.co.uk`
2. Update/add these records:

| Type | Name | Value | TTL |
|---|---|---|---|
| **CNAME** | `www` | `printersrus.onrender.com` | 600 |
| **A** | `@` | *(IP provided by Render)* | 600 |

> Render shows the exact values on the Custom Domains page. The A record IP may vary — use what Render tells you.

3. **Remove** any conflicting A records for `@` or `www` that point elsewhere

### c) Wait for DNS + SSL

- DNS propagation: 5-30 minutes
- Render automatically provisions a free **SSL certificate** (Let's Encrypt) once DNS is verified
- Check status on Render's Custom Domains page — it will show a green checkmark when ready

Your site is now live at **https://printersrus.co.uk**

---

## 4. Set Up the Admin Account

1. Visit `https://printersrus.co.uk/admin/setup`
2. Fill in your name, email, password
3. Enter the **ADMIN_SETUP_KEY** from your Render environment variables
   - Find it in: **Render Dashboard > printersrus > Environment > ADMIN_SETUP_KEY**

---

## 5. Set Up CI/CD (GitHub Actions)

The project includes two GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`) — runs tests on every push and PR
- **CD** (`.github/workflows/deploy.yml`) — tests then triggers Render deploy on push to `main`

### a) Get your Render Deploy Hook

1. In **Render Dashboard > printersrus > Settings > Build & Deploy**
2. Scroll to **Deploy Hook**
3. Click **Create Deploy Hook** — copy the URL

### b) Add GitHub Secret

Go to your repo: **Settings > Secrets and variables > Actions > New repository secret**

| Secret | Value |
|---|---|
| `RENDER_DEPLOY_HOOK` | The deploy hook URL from Render |

### c) Create GitHub Environment (optional)

Go to **Settings > Environments > New environment**, name it `production`. Optionally add:
- **Required reviewers** — for manual approval before deploy
- **Wait timer** — delay before deploy starts

### d) How it works

```
Push to main       → CI (tests) → CD (trigger Render deploy)
Push to feature/*  → CI (tests only)
Pull request       → CI (tests only)
Manual trigger     → CD (from GitHub Actions tab)
```

> **Note:** Render also auto-deploys when you push to GitHub (if auto-deploy is enabled). The GitHub Actions CD workflow adds a test gate — it only triggers the deploy after tests pass.

---

## Ongoing Operations

### View logs
In **Render Dashboard > printersrus > Logs**

### Restart
In **Render Dashboard > printersrus > Manual Deploy > Restart**

### Redeploy
Push to `main` (auto-deploys via CI/CD), or use **Manual Deploy > Deploy latest commit** in Render.

### Database backup
Use Render's **Shell** tab:
```bash
cp /app/data/printers.db /app/data/backup-$(date +%Y%m%d).db
```
Or download via Render's persistent disk management.

### Environment variables
Manage in **Render Dashboard > printersrus > Environment**

---

## File Structure

```
.github/
└── workflows/
    ├── ci.yml                # CI — runs tests on push & PR
    └── deploy.yml            # CD — triggers Render deploy on push to main
render.yaml                   # Render Blueprint (auto-configures the service)
Dockerfile                    # Docker build for the Next.js app
docker-compose.yml            # Local Docker development
DEPLOYMENT.md                 # This file
```

---

## Cost Summary

| Service | Cost |
|---|---|
| Render Starter plan | $7/month |
| Render persistent disk (1 GB) | included |
| SSL certificate | free (Let's Encrypt via Render) |
| GoDaddy domain (printersrus.co.uk) | already owned |
| **Total** | **~$7/month** |
