# Always-Active Deployment Guide for Digital Heroes

This guide explains how to deploy the Digital Heroes platform to a cloud hosting provider that **remains active 24/7 without sleeping or spinning down**.

---

## Comparison of Always-Active Hosting Services

| Platform | Cost | Free Always-On? | Sleeps/Spins Down? | Credit Card Required? | Recommended For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[Koyeb](https://www.koyeb.com)** | **Free** | **Yes (Eco Nano)** | **Never Sleeps (24/7)** | **No** | ⭐ **Best & Easiest (Recommended)** |
| **[Fly.io](https://fly.io)** | Free allowance | **Yes** (`auto_stop_machines = false`) | Never (with 1 replica) | Yes | Advanced / Persistent SSD Volume |
| **[Render](https://render.com)** | Free | With Keep-Alive Action | Sleeps after 15m (bypassed with Action) | No | Simple alternative with fixed blueprint |
| **[Railway](https://railway.app)** | $5 trial | Yes | Never while active | No | Fast Docker deployment |

---

## 1. Deploy on Koyeb (Recommended — Never Sleeps, No Credit Card)

Koyeb is a modern serverless container platform whose free Eco tier **does not spin down or sleep after inactivity**. Your app remains 100% active and responsive 24 hours a day, 7 days a week.

### Steps to Deploy (Takes ~90 seconds):

1. **Sign Up / Log In**:
   Go to **[https://app.koyeb.com](https://app.koyeb.com)** and sign in with your GitHub account.

2. **Create New Service**:
   - In the Koyeb dashboard, click **Create App** or **Create Service**.
   - Select **GitHub** as the deployment source.
   - Select the repository: `overratedengineer/digital-heroes`.
   - Branch: `main`.

3. **Build & Runtime Configuration**:
   - Koyeb automatically detects the **Dockerfile** in the repository root.
   - Builder: **Dockerfile**.
   - Instance Type: **Eco Nano** (`nano`, 512MB RAM, 0.1 vCPU — Free Tier).

4. **Port & Health Check**:
   - Exposed Port: **4000** (Protocol: HTTP, Path: `/`).
   - Health check path (optional): `/api/health`.

5. **Deploy**:
   - Click **Deploy**.
   - Koyeb will build the multi-stage Docker container (React web build + Express API + SQLite seed).
   - Once deployed (usually 2–3 minutes), you will receive a permanent HTTPS URL like:
     ```text
     https://digital-heroes-<username>.koyeb.app
     ```
   - **Your app is now live and will stay online 24/7 without sleeping!**

---

## 2. Deploy on Fly.io (Persistent Volume + Always-On)

Fly.io provides global edge container hosting with persistent SSD volumes.

1. **Install Fly CLI**:
   ```bash
   brew install flyctl
   fly auth login
   ```

2. **Launch Using Included Configuration**:
   ```bash
   fly launch --no-deploy
   ```

3. **Deploy**:
   ```bash
   fly deploy
   ```

The included `fly.toml` has `auto_stop_machines = false` and `min_machines_running = 1`, ensuring the instance never pauses or scales to zero.

---

## 3. Deploy on Render (With Automated 24/7 Keep-Alive Bot)

Render's free tier sleeps after 15 minutes of inactivity. However, this repository includes an automated **GitHub Actions Keep-Alive Workflow** (`.github/workflows/keepalive.yml`) that pings `/api/health` every 10 minutes to prevent it from ever sleeping.

### Steps:
1. Go to **[https://dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** -> **Blueprint**.
3. Select `overratedengineer/digital-heroes`.
4. Render will parse the updated `render.yaml` (which is now free-tier compatible with no invalid disk configurations) and deploy the Docker web service.
5. Once your Render URL is assigned (e.g., `https://digital-heroes-xyz.onrender.com`):
   - Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**.
   - Click **New repository variable**.
   - Name: `APP_URL`.
   - Value: `https://digital-heroes-xyz.onrender.com`.
6. The included GitHub Action will automatically ping your app every 10 minutes, keeping it awake 24/7 with zero cold starts!

---

## 4. Verification and Credentials

Once deployed on any platform, test the deployment using the built-in credentials:

- **Health Check**: `GET /api/health` -> returns `{"ok":true,"service":"digital-heroes-api",...}`
- **Member (Alex Morgan)**:
  - Email: `demo@digitalheroes.local`
  - Password: `Demo@12345`
- **Admin**:
  - Email: `admin@digitalheroes.local`
  - Password: `Admin@12345`

Seed data (4 verified charities, Alex Morgan's recent 5 Stableford scores, active subscription, and past draws) is initialized automatically in SQLite on first launch.
