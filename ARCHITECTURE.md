# Architecture

```text
Browser
  │
  ├── React + Vite SPA
  │     ├── Public experience
  │     ├── Member workspace
  │     └── Admin Studio
  │
  └── /api
        │
        ├── Express API
        ├── JWT auth + role guard
        ├── Zod request validation
        ├── Draw engine service
        ├── Demo payment adapter
        ├── Winner proof upload
        └── SQLite repository
```

### Why this shape

- Frontend and backend are separated so the web client can be deployed to Vercel and the API/database can be deployed independently.
- The draw engine is a service rather than UI logic, keeping prize calculations testable and auditable.
- Subscription payments are behind a provider boundary so demo mode is zero-config while Stripe can be introduced without rewriting the member UI.
- SQLite is used for the local assignment build. The SQL schema is conventional and can be migrated to Postgres/Supabase for the PRD's production deployment constraint.
