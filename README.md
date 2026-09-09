# Ever After — Wedding Planner

Ever After is a wedding workspace for a shared Couple account, Vendor businesses and public visitors.
Couples manage Wedding Details, Tasks and their derived Timeline, Guest List/RSVP, vendors,
commitments and payment history. Optional Setup connects to the same vendor relationships.
The Dashboard summarizes these sources; its date area celebrates the final week and wedding day.

## Stack and current status

Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/Auth/Storage/RLS, Zod, Tailwind CSS,
Vitest and Playwright. Vercel deployment is **pending**. Frankfurt Supabase is the existing live
backend: wedding-planner-project-eu, eu-central-1. Do not recreate or reseed it for local QA.
The Assistant supports the deterministic Local provider (default) and explicitly configured server-only OpenAI Responses with ten internal READ tools and two bounded research tools. Owner-approved live QA has verified wedding guidance, internal data, Marketplace and safely qualified partial official research. No executable product-WRITE tool exists. Local operation requires no AI or privileged admission credential.

The fictional Marketplace contains **496 vendors, 8 categories, 27 subcategories and 2,727 reviews**.
Its 291 tracked WebPs comprise 227 pooled images and 64 dedicated newer-vendor primary images.
See [Marketplace dataset](docs/MARKETPLACE_DATASET.md).

## Local installation

Requirements: Node.js 22+ and pnpm 11. Use the package-manager version declared in package.json.

1. Run `pnpm install`.
2. Copy .env.example to .env.local only if the local file does not already exist.
3. Configure the names documented below locally; never commit .env.local.
4. Use a Supabase database with all repository migrations applied in chronological order, or leave
   Supabase configuration blank for the read-only demo Marketplace. Private workspace features need Auth/database configuration.
5. Run `pnpm dev` and open http://localhost:3000.

| Environment variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Browser-safe project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser-safe publishable key |
| NEXT_PUBLIC_SITE_URL | Canonical application origin for Auth callbacks; localhost during development |
| AI_PROVIDER | Omission/local selects Local; explicit openai requires server configuration and fails closed otherwise |
| OPENAI_API_KEY | Server-only OpenAI credential; never commit its value |
| OPENAI_MODEL | Validated server-only model selection; no model is silently substituted |
| SUPABASE_SERVICE_ROLE_KEY | Server-only secret for the dedicated three-RPC admission channel; unnecessary for Local |

The normal app needs no database password, service-role key or AI key. Configure Supabase Auth's
Site URL and allowed callback/recovery URLs for the intended application origin. Vercel will require
its own environment settings when deployment is approved. Source specification/course PDFs and
local coding-agent guidance are not install/build dependencies. The final Product Specification
is submitted separately.

The OpenAI path is protected by persistent admission limits: 500 global turns, 150 per Couple,
one active request per Couple, stable request identity and a server-derived digest. There is no
short-window AI throttle. Terminal uncertain outcomes retain quota and cannot redispatch.
The main loop has four rounds (round four answer-only), six custom calls, a 30-second deadline,
zero retries, 1,200 output tokens per response and a 10,000-character final text cap. Research has
one adapter invocation per turn, one built-in search and a 15-second/remaining-turn timeout.
Sources are server-validated; partial/insufficient findings are expected when currentness or
comparability cannot be established. Live validation does not certify universal current facts.
Billing is owner-managed; Auto Reload must remain OFF. Tests need no real credentials:
`pnpm exec vitest run tests/assistant tests/ui/assistant*`.

## Database setup

Preserve and review every file under supabase/migrations, in this order:

1. 202609020001_initial_schema.sql
2. 202609020002_rls_and_storage.sql
3. 202609030001_vendor_location_city.sql
4. 202609040001_profile_role_permissions.sql
5. 202609050001_couple_identity_and_external_vendors.sql
6. 202609050002_guest_list.sql
7. 202609050003_booked_vendor_budget_sync.sql
8. 202609070001_task_waiting_on_vendor.sql
9. 202609070002_role_boundary_hardening.sql

These changes are already represented in the live Frankfurt schema, including the reviewed
050003/070001/070002 applications. Earlier manual SQL Editor applications mean the migration ledger
is not authoritative. **Do not blindly run db push, replay migrations or alter the ledger.** A fresh
isolated database needs the complete sequence; an existing database needs catalog preflight and
separate approval for changes. The enum addition must commit before its new value is used.

supabase/seed.sql is intentional synthetic demo setup, generated with the fallback JSON by
scripts/generate-marketplace-seed.mjs. Apply it only to an explicitly selected development/demo
database, never automatically to Frankfurt. Seed checking/generation does not execute SQL.
Booked commitments are synchronized only by the database; payments alone determine Paid.

## Build and unit tests

- `pnpm lint` — whole-repository ESLint
- `pnpm typecheck` — TypeScript
- `pnpm test` — all maintained Vitest tests
- `pnpm seed:check` — read-only generated-data/image consistency
- `pnpm seed:generate` — intentionally regenerate local seed/JSON, not the database
- `pnpm build` — production build
- `pnpm start` — serve that build
- `pnpm check` — seed check, lint, typecheck, Vitest, build

Where Windows sandbox restrictions prevent Turbopack builds, `pnpm exec next build --webpack`
uses the supported alternative bundler without changing application configuration.

## Browser tests

Install the free local browser once: `pnpm exec playwright install chromium`.
For the normal-app suite, use a separate local server with the two Supabase public variables blank
at build and start time. This exercises the deterministic preview without live credentials/data.
For example, in PowerShell 7.5+ (process-only settings; do not edit .env.local):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = ''
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ''
$env:AI_PROVIDER = 'local'
pnpm exec next build --webpack
pnpm exec next start --port 3106
```

In a second terminal, set PLAYWRIGHT_EXTERNAL_SERVER=1 and PLAYWRIGHT_BASE_URL to
http://localhost:3106, then run:

`pnpm test:e2e public.spec.ts public-redesign.spec.ts responsive-auth.spec.ts visual-consistency.spec.ts auth-verification.spec.ts password-recovery.spec.ts marketplace-subcategories.spec.ts couple-features-boundary.spec.ts security-boundaries.spec.ts --workers=1`

Use the explicit file list: the root config discovers all specs, but five suites require their own
isolated component hosts. Run those separately from the repository root:

- `pnpm exec playwright test --config=e2e/assistant.config.ts`
- `pnpm exec playwright test --config=e2e/budget.config.ts`
- `pnpm exec playwright test --config=e2e/setup.config.ts`
- `pnpm exec playwright test --config=e2e/tasks.config.ts`
- `pnpm exec playwright test --config=e2e/wedding-week.config.ts`

These use loopback ports 3101–3105, synthetic fixtures and no live mutations. The wedding-week
filename now tests only countdown/date treatment, never a separate operational dashboard.
Reports, traces, screenshots and caches are ignored. Do not use live records for mutation QA.

## PostgreSQL tests

With Docker running and the existing postgres:17 image available locally:

- `node tests/database/task-status-postgres.mjs`
- `node tests/database/security-rls-postgres.mjs`

Both use disposable local containers, synthetic rows, no host database port and cleanup on exit.
The security runner covers actual migrations/RLS/triggers; Auth and Storage SQL boundaries use
minimal stubs. It does not replace full Supabase JWT or Storage HTTP adversarial testing.
The two maintained SQL tests under supabase/tests use pgTAP: run them against a disposable Supabase-
compatible database with all migrations and pgTAP available, e.g. `supabase test db` after configuring
that isolated environment. They are not included in Vitest. Never target the live project.

## Submission documents

[Technical design](docs/TECHNICAL_DESIGN.md), [test specification](docs/TEST_SPECIFICATION.md),
[security](docs/SECURITY.md), [scalability](docs/SCALABILITY.md),
[architecture guide](docs/IMPLEMENTATION_GUIDE.md), [Agent specification](docs/AI_AGENT_SPEC.md),
[booking/budget rules](docs/BOOKED_VENDOR_BUDGET.md) and
[presentation outline](docs/PRESENTATION_OUTLINE.md).
The final specification, final presentation, live Vercel URL and repository submission link are
separate final deliverables. No push or deployment is implied by local commands.
