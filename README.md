# Digital Heroes — Full-Stack Assignment

A polished, zero-configuration demo implementation of the Digital Heroes PRD: subscription-driven golf score tracking, charity impact, monthly prize draws, winner verification, and a full admin console.

## Run it

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

The API runs on **http://localhost:4000**.

### Demo accounts

- **User:** `demo@digitalheroes.local` / `Demo@12345`
- **Admin:** `admin@digitalheroes.local` / `Admin@12345`

No external service, database, API key, or environment variable is required for the included demo mode. SQLite is created automatically in `data/digital-heroes.db`.

## Production adapters

The project deliberately defaults to local demo payments so the assignment can be run immediately. The payment boundary is isolated in `apps/api/src/services/paymentService.ts`; replace the demo adapter with Stripe (or another PCI-compliant provider) and add provider secrets for a real deployment. Likewise, the repository layer is isolated so SQLite can be replaced by Supabase/Postgres without changing the UI contract.

## Product decisions for PRD ambiguities

The PRD does not specify subscription prices or the exact percentage of subscription revenue routed to the prize pool. Defaults are therefore explicitly treated as demo configuration:

- Monthly: ₹999
- Yearly: ₹9,990
- Prize pool allocation: 30%
- Charity: minimum 10%, user can increase up to 50%

The prize tiers follow the PRD exactly: 5-match 40% rollover jackpot, 4-match 35%, 3-match 25%.

## Implemented scope

- Public landing page with impact-first visual language
- Signup/login with JWT authentication
- Monthly/yearly subscription flow with demo checkout
- Subscription lifecycle states and renewal/cancellation controls
- Last-five Stableford scores with one score/date validation and rolling replacement
- Charity directory, search/filter, detail pages, signup selection and contribution percentage
- Independent charity donation flow
- Monthly draw simulation, weighted/random modes, publishing, prize-pool calculation and jackpot rollover
- Winner proof upload metadata + admin verification + payout states
- Subscriber dashboard with all required PRD modules
- Admin dashboard: users, scores, subscriptions, charities, draws, winners, analytics
- Responsive desktop/mobile UI, motion, loading states, toasts, empty states and error handling
- SQLite schema with indexes and deterministic seed data
- Automated draw calculations in a service layer

## Design direction

The visual system takes inspiration from contemporary Figma/Dribbble/Behance work in fintech and impact products: deep editorial greens, warm paper surfaces, high-contrast typography, rounded data cards, restrained motion, and impact-first storytelling. It intentionally avoids traditional golf clichés, matching the PRD's “feel, not fairway” requirement.

References used for direction (not copied assets):
- Dribbble modern fintech dashboard: https://dribbble.com/shots/27261256-FinTech-Dashboard-UI-UX-design
- LIMINAL Easy Donate case study: https://liminals.design/en/case-studies/easy-donate/
- Behance Charity Management Dashboard: https://www.behance.net/gallery/225092667/Charity-Management-Dashboard-UIUX-Design
- Envato Rise Impact Dashboard: https://elements.envato.com/rise-impact-report-and-ngo-transparency-dashboard-EG5Y3T5

## Build

```bash
npm run build
npm start
```

The web build is produced in `apps/web/dist`. For a real public deployment, serve that build from a static host and deploy the API separately with a managed Postgres/Supabase database and a real payment provider.
