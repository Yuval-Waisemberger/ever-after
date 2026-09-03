# Ever After — Wedding Planner

Ever After is a full-stack wedding workspace for couples, vendors, and guests. Couples manage one
shared wedding, tasks, a single-source timeline, vendor relationships, a budget, payment schedules,
and a context-aware Wedding Assistant. Vendors maintain public profiles and galleries. Guests can
browse published vendors and reviews.

The implementation follows `project-docs/Wedding_Planner.docx`, the official course brief in
`project-docs/Internet_Technologies_English.pdf`, and the local-only `AGENTS.md` guidance.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase PostgreSQL, Auth, Row Level Security, and Storage
- Zod server-side validation
- Vitest for domain/provider tests and Playwright for critical browser flows
- Vercel as the required deployment target

## Local setup

Requirements: Node.js 22+ and pnpm 11.

1. Install dependencies: `pnpm install`.
2. Copy `.env.example` to `.env.local` if it does not already exist.
3. In the existing Supabase project, find the public Project URL and publishable key under the
   project's Connect/API settings. Enter them locally as:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   AI_PROVIDER=local
   ```

   These two Supabase values are browser-safe, but `.env.local` is still ignored and must never be
   committed. Do not put a database password, service-role key, Supabase secret key, or AI key in a
   `NEXT_PUBLIC_*` variable.
4. Review and apply `supabase/migrations/202609020001_initial_schema.sql`, followed by
   `supabase/migrations/202609020002_rls_and_storage.sql` and
   `supabase/migrations/202609030001_vendor_location_city.sql`, to the existing
   `wedding-planner-project` Supabase project. Never create a second project.
5. Optionally apply `supabase/seed.sql` in a development/demo environment.
6. Start the app with `pnpm dev`, then open `http://localhost:3000`.

When Supabase variables are blank, the landing page and a read-only seeded marketplace preview still
work, while authentication and private workspaces show a safe configuration message. No paid AI
provider is required: `AI_PROVIDER=local` provides grounded summaries, comparison, and curated
general guidance.

## Commands

```text
pnpm dev         local development server
pnpm lint        ESLint
pnpm typecheck   TypeScript without emitting files
pnpm test        Vitest unit/provider suite
pnpm test:e2e    Playwright browser tests
pnpm seed:generate regenerate SQL, fallback JSON, statistics, and demo SVGs
pnpm seed:check    verify all generated marketplace artifacts are current
pnpm build       production build
pnpm check       seed verification + lint + typecheck + unit tests + production build
```

Playwright needs its free local Chromium runtime once: `pnpm exec playwright install chromium`.
Database/RLS tests additionally need a Supabase local test environment or reviewed remote test
project state; they must not be pointed at production data casually.

## Database and demo data

All schema changes are reproducible SQL migrations. Monetary values use integer agorot. The seed is
generated deterministically from `scripts/generate-marketplace-seed.mjs` and contains 432 fictional
vendors across the specification's 19 subcategories, 2,380 fictional reviews, and local SVG demo
images. It contains no accounts, passwords, private credentials, external image dependency, or real
vendor claims. See `docs/MARKETPLACE_DATASET.md` for the exact distribution and research basis.

## Deployment

Import the existing GitHub repository into Vercel, configure the same three public environment
variables there, and update Supabase Auth Site URL/redirect allow-list for the Vercel domain. Keep
`AI_PROVIDER=local` unless a provider is deliberately selected later. No Git commit, push, Supabase
mutation, or Vercel deployment is performed automatically by this repository.

See `docs/TECHNICAL_DESIGN.md`, `docs/TEST_SPECIFICATION.md`, `docs/SECURITY.md`,
`docs/SCALABILITY.md`, and `docs/PRESENTATION_OUTLINE.md` for the course deliverables.
