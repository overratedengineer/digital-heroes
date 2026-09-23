# Digital Heroes — Technical Submission & Architecture Notes

## 1. Executive Summary

Digital Heroes is a full-stack platform that combines amateur golf performance tracking, recurring charitable giving, and monthly prize draws. The core value proposition transforms everyday golf scores into measurable social impact and life-changing jackpot opportunities.

This submission is an end-to-end, zero-configuration implementation of the Level 1 Product Requirements Document (PRD). It comprises a high-performance React + TypeScript single-page application (SPA), an Express + SQLite backend with robust domain services, automated monthly draw simulation with rollover mechanics, proof-of-performance verification workflows, and an administrative control studio.

- **GitHub Repository**: [https://github.com/overratedengineer/digital-heroes](https://github.com/overratedengineer/digital-heroes)
- **Deployment Guide & Always-Active Cloud Options**: [`DEPLOYMENT.md`](./DEPLOYMENT.md) (Native support for Koyeb 24/7 Free Always-On, Fly.io, Railway, and Render with automated keep-alive workflow)

---

## 2. Quick Access & Demo Credentials

The platform runs out-of-the-box with deterministic seed data, allowing evaluators to immediately test both user and administrator workflows.

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Subscriber (Member)** | `demo@digitalheroes.local` | `Demo@12345` | Score logging (1–45), charity allocation slider, donation modal, subscription management, draw history, winner proof submission. |
| **Platform Admin** | `admin@digitalheroes.local` | `Admin@12345` | User directory, score modification, draw simulation engine (random/algorithmic), draw publishing, winner proof verification, charity curation, revenue analytics. |

---

## 3. Architecture & Tech Stack

The system follows a modular monorepo structure separating presentation concerns from business logic and data persistence:

```text
Browser Client
  │
  ├── React 19 + TypeScript + Vite SPA
  │     ├── Public Experience (Landing, Impact Story, Rules, Charity Directory)
  │     ├── Member Workspace (Dashboard, Last 5 Scores, Impact Allocation, Proof Upload)
  │     └── Admin Studio (Draw Simulator, User Management, Charity CRUD, Winner Verification)
  │
  └── Express 5 REST API (Node 20)
        ├── JWT Authentication & Role-Based Guards (`user` vs `admin`)
        ├── Zod Schema Validation & Input Sanitization
        ├── Draw Simulation Engine (Random & Algorithmic Score-Weighted)
        ├── Isolated Payment Provider Boundary (Demo adapter -> Stripe-ready)
        ├── Multi-part File Upload Handling (Multer) for Winner Proof
        └── SQLite Repository Layer with WAL Mode & Foreign Key Integrity
```

### Technology Justifications:
1. **React 19 + Vite**: Instant HMR, minimal bundle overhead, and snappy page transitions suitable for dashboard-heavy workflows.
2. **Vanilla CSS & Modern Design Tokens**: Curated editorial design language (deep greens `#0b1713`, `#0d2818`, warm paper surfaces `#f4f6f0`, high-contrast typography) avoiding generic templates and clichéd golf fairway aesthetics in favor of a premium fintech/impact aesthetic.
3. **Framer Motion & Lucide Icons**: Subtle micro-interactions, responsive sidebars, modals, and data cards that feel tactile and engaging.
4. **SQLite (`better-sqlite3`)**: Single-file zero-config database operating in Write-Ahead Logging (WAL) mode for fast concurrent reads and ACID compliance during local evaluation.
5. **Multi-Stage Dockerfile**: Enables containerized portability to any cloud host (Render, Railway, Fly.io, AWS ECS, VPS) with persistent volume support for data and uploaded proofs.

---

## 4. Key Functional Modules & PRD Implementation

### 4.1. Subscription Lifecycle & Payment Boundary (§ 05)
- **Tiers**: Monthly (₹999/mo) and Yearly (₹9,990/yr) membership plans.
- **State Machine**: Supports `active`, `inactive`, and `cancelled` lifecycle states with automated 30-day/365-day renewal date tracking.
- **Provider Boundary**: The payment flow is isolated behind a clean service contract (`createSubscription`, `cancelSubscription`). While defaulting to a frictionless demo adapter for assignment review, the boundary is architected to accept Stripe Checkout or Webhook payloads without touching UI contracts.

### 4.2. Golf Score Tracking & Rolling Window (§ 07)
- **Stableford Validation**: Scores are strictly constrained to integers between 1 and 45.
- **Temporal Constraint**: Enforces a strict one-score-per-calendar-date rule using database uniqueness constraints (`UNIQUE(user_id, score_date)`) and server-side validation.
- **Rolling Five Mechanism**: Members retain their latest five historical scores. When a sixth score is entered, the oldest score is automatically pruned, maintaining a rolling five-score set.
- **Full CRUD**: Members can add, edit, or delete scores directly from their dashboard.

### 4.3. Monthly Draw Engine & Rollover Mechanics (§ 08 & § 11.05)
- **Dual Draw Modes**:
  1. *Pure Random*: Generates 5 unique sorted integers between 1 and 45.
  2. *Algorithmic (Score-Weighted)*: Analyzes historical score frequencies across the active subscriber base, applying Laplace smoothing (weight 1 + frequency * 3) to model real-world performance patterns.
- **Prize Pool Allocation**: 30% of active subscription revenue is routed to the monthly prize pool.
- **Prize Tiers**:
  - **5-Match**: 40% of pool (Rollover Jackpot). If no member matches all 5 scores, this entire tier rolls over into the next month's jackpot.
  - **4-Match**: 35% of pool (shared equally among all 4-match winners).
  - **3-Match**: 25% of pool (shared equally among all 3-match winners).
- **Simulation vs. Publishing**: Admins can run non-destructive simulations to preview winner distribution, total payouts, and rollover amounts before committing and publishing the official draw.

### 4.4. Charity Impact & Direct Giving (§ 06 & § 11.03)
- **Mandatory Minimum**: Every subscriber selects a charity during onboarding with a baseline 10% contribution from their membership.
- **Flexibility**: Members can increase their contribution percentage up to 50% at any time via an interactive slider in their profile.
- **Independent Donations**: Members can make one-off direct donations of any amount to any verified charity.
- **Directory & Search**: Filter charities by category (Youth, Environment, Health, Education) or search by keyword with full details on community impact and upcoming events.

### 4.5. Winner Proof & Verification Pipeline (§ 09 & § 11.04)
- **Proof Submission**: Winners can upload photographic proof (scorecard, club certification) via multi-part form upload or link a digital verification record.
- **Admin Verification Workflow**: Admins inspect submitted proofs, mark statuses (`pending`, `approved`, `rejected`), append operational notes, and update payout states (`pending` → `paid`).

### 4.6. Admin Studio & Observability (§ 11)
- **Platform Analytics**: Real-time aggregation of total registered users, active subscribers, cumulative prize pools, charity donations disbursed, and pending verifications.
- **User Management**: Admins can inspect user profiles, modify subscription states, edit or delete suspicious scores, and review individual draw win histories.
- **Charity Management**: Full administrative CRUD to add new non-profits, toggle featured status, update impact statements, or archive partners.

---

## 5. Explicit Ambiguity Resolutions

Where the PRD left specific details open, deliberate and documented product decisions were made:

1. **Subscription Pricing & Prize Pool Percentage**: The PRD specifies subscription mechanics and tier splits (40/35/25), but does not fix price points or the exact percentage allocated from revenue. Defaults were set to ₹999/mo, ₹9,990/yr, and a 30% prize pool allocation. All three values are isolated constants in `apps/api/src/services.ts`.
2. **Stableford Matching Logic**: The PRD describes a "5-number match" against Stableford scores (1–45). If a golfer has logged duplicate scores across different rounds (e.g., scoring 36 twice), this implementation deduplicates their scores into a distinct set before matching against the 5 winning numbers. This ensures a repeated score cannot artificially inflate match counts.
3. **Rollover Execution**: When a 5-match tier goes unclaimed, the rollover amount is persisted in the `draws` table (`jackpot_rollover`) and automatically pulled into the subsequent draw's simulation.

---

## 6. Security, Integrity & Error Handling

- **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, carrying user IDs and role claims, expiring after 7 days.
- **Password Security**: Passwords hashed with `bcryptjs` using 10 salt rounds.
- **Role Guards**: Express middleware strictly isolates `/api/admin/*` routes to accounts with `role === 'admin'`.
- **Input Validation**: All incoming request bodies are validated using strict Zod schemas, returning `400 Bad Request` with human-readable error messages on invalid input.
- **Database Integrity**: Foreign key constraints with `ON DELETE CASCADE` prevent orphaned records (e.g., deleting a user cascades scores, entries, and winner references).
- **Graceful Client Fallbacks**: The frontend handles empty states, network errors, loading skeletons, and displays toast feedback for all user actions.

---

## 7. Production Roadmap & Scalability

While this submission intentionally prioritizes zero-friction local and containerized review, the codebase is structured for straight-forward enterprise scaling:

1. **Database Migration**: The SQLite schema in `db.ts` uses ANSI SQL types. It can be migrated to managed PostgreSQL or Supabase with minimal changes to query syntax.
2. **Object Storage**: The local file upload directory (`/uploads`) can be swapped for an Amazon S3 or Cloudflare R2 bucket by updating the storage adapter in `server.ts`.
3. **Payment Provider**: Replace `demo` provider in `services.ts` with Stripe Checkout Sessions and a webhook listener for `customer.subscription.updated` / `invoice.payment_succeeded`.
4. **CI/CD Pipeline**: GitHub Actions workflow to run automated linting, type-checking, and build validation on every pull request, auto-deploying to Render or AWS.

---

## 8. Summary of Files Provided

| File | Purpose |
| :--- | :--- |
| `apps/web/` | React 19 + TypeScript frontend application |
| `apps/api/` | Express backend with services and SQLite schema |
| `Dockerfile` | Multi-stage production container build |
| `docker-compose.yml` | One-command local/server container orchestration |
| `koyeb.yaml` | Always-active Koyeb 24/7 cloud deployment configuration |
| `fly.toml` | Fly.io always-on configuration with persistent volume |
| `railway.json` | Railway Docker deployment blueprint |
| `render.yaml` | Infrastructure-as-code deployment blueprint (free-tier compatible) |
| `.github/workflows/keepalive.yml` | 24/7 automated uptime ping bot to keep free deployments awake |
| `DEPLOYMENT.md` | Complete deployment guide with 1-click cloud instructions |
| `digital-heroes.zip` | Complete clean source code archive (~284 KB) |
| `README.md` | Quickstart, credentials, and project summary |
| `ARCHITECTURE.md` | System component and data flow diagrams |
| `PRD-COVERAGE.md` | Clause-by-clause requirement traceability |
