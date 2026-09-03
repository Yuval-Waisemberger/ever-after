# Wedding Planner Implementation Plan

Status: approved project direction for local implementation  
Prepared: 2026-09-02

## 1. Sources and requirement priority

This plan follows, in order:

1. `project-docs/Internet_Technologies_English.pdf` (official course requirements)
2. `project-docs/Wedding_Planner.docx` (product specification)
3. `AGENTS.md` (persistent local implementation guidance)
4. Course lecture conventions and official framework/service documentation

Both local source documents were read completely and are left unchanged. The course site at
`https://full-stack-lectures.vercel.app/` could not be fetched from this environment on 2026-09-02:
the direct request timed out and the domain returned no indexed search results. This does not block
implementation because the official local course brief is authoritative. Current primary Next.js,
Supabase, and Vercel documentation is used for details that can change over time.

## 2. Scope and delivery principle

The application will be a coherent wedding workspace, not a collection of demos. The core MVP will
be completed in the priority order in `AGENTS.md`. Second-priority work starts only after the core is
stable. Third-priority ideas remain documented future work unless time remains.

No paid service, alternate deployment platform, second Supabase project, Git commit, Git push, or
remote Supabase mutation is part of this implementation pass. Database changes are represented as
reviewable migrations first. The original specification and course PDF are never modified.

## 3. Application architecture

- **Framework:** Next.js App Router with TypeScript and React.
- **Rendering:** Server Components for page reads and summaries; Client Components only for form
  interaction, filters, wizard state, dialogs, upload progress, and the assistant conversation UI.
- **Backend:** Next.js Server Actions for application-owned form mutations; Route Handlers only for
  authentication callbacks and the assistant's explicit HTTP boundary.
- **Database and authentication:** Supabase PostgreSQL, Supabase Auth email/password, and
  `@supabase/ssr` cookie-based sessions.
- **Authorization:** PostgreSQL grants plus Row Level Security on every exposed table. Next.js route
  checks improve UX, while RLS remains the security boundary.
- **Images:** Supabase Storage public vendor-media bucket; only the owning vendor can mutate its
  folder. Metadata stays in PostgreSQL.
- **Validation:** shared Zod schemas at every server mutation boundary; native browser constraints
  provide immediate feedback but never replace server validation.
- **Deployment:** Vercel for Next.js and the existing Supabase Free project for data/auth/storage.
- **AI:** a small server-only provider interface. A deterministic local provider keeps grounded
  account queries, vendor comparisons, and curated general guidance usable without an API key.
  Optional external AI/web research stays disabled until the user explicitly configures a provider.

### Request/data flow

1. A request reaches Next.js `proxy.ts`, which refreshes the Supabase cookie session only.
2. A Server Component obtains the verified user with Supabase Auth and reads through a caller-scoped
   Supabase client.
3. RLS restricts rows by `auth.uid()` regardless of UI or route checks.
4. A form submits to a Server Action, which re-authenticates, validates with Zod, performs a scoped
   mutation, and revalidates the affected route.
5. The assistant Route Handler re-authenticates, loads only relevant context through RLS-scoped
   queries, calls the configured provider, and records source-labelled messages.

## 4. Routes and pages

### Public

- `/` - minimal vintage landing page; authenticated users redirect by role.
- `/auth/couple` - couple sign-up/login; registration is separate from setup.
- `/auth/vendor` - vendor sign-up/login.
- `/auth/callback` - PKCE code exchange Route Handler.
- `/vendors` - public marketplace with search, pagination, and URL-driven filters.
- `/vendors/[slug]` - public vendor profile with gallery and integrated reviews.

### Couple-only

- `/wedding` - My Wedding Dashboard (the couple home, not a separate top-level Dashboard).
- `/wedding/setup` - five short, skippable setup steps.
- `/wedding/details` - the only user-facing place to view/edit wedding details.
- `/wedding/timeline` - dated tasks grouped relative to the wedding date or by absolute date.
- `/tasks` - task CRUD, filters, priority, and status.
- `/vendors/my` - Saved, Contacted, Considering, Booked, and Rejected vendors.
- `/budget` - overview, vendor expenses, payments due, and paid history in one area.
- `/assistant` - context-aware wedding assistant and AI vendor comparison.
- `/settings` - couple account settings and logout.

### Vendor-only

- `/vendor` - Vendor Dashboard, profile completion, ratings, and recent reviews.
- `/vendor/profile` - business profile, category attributes, contact data, gallery, and services.
- `/vendor/explore` - reuses the public marketplace organization.
- `/vendor/settings` - vendor account settings and logout.

Wedding Week is a conditional state of `/wedding`, never a permanent navigation item. There is no
standalone Wedding Profile, Reviews, Payments, Compare, or AI-generated planner route.

## 5. Database schema and relationships

Money is stored as integer Israeli agorot (`*_minor`) to avoid floating-point errors. IDs are UUIDs;
timestamps are UTC; user-entered due dates remain PostgreSQL `date` values.

### Identity and ownership

- `profiles`: `id -> auth.users.id`, `role (couple|vendor)`, display name, phone, timestamps.
- `weddings`: one row per shared Couple account; unique `owner_user_id -> profiles.id`, partner
  names/phones/emails, date, venue state/name, guest count, preferred area, event type, styles,
  priorities, already-booked categories, total budget, setup state, timestamps.
- `vendor_profiles`: public business record with nullable unique `owner_user_id -> profiles.id`
  (nullable permits migration-owned demo vendors), slug, business/contact fields, category,
  subcategory, physical/home-base city, service areas, price range, services, styles, event types,
  capacity, venue-specific flags, publication state, timestamps.

### Marketplace

- `vendor_categories`: stable high-level groups and sort order.
- `vendor_subcategories`: belongs to a category; typed slug/name and sort order.
- `vendor_images`: belongs to a vendor; storage path, alt text, position, and main-image flag.
- `couple_vendors`: unique `(wedding_id, vendor_id)` relation with status, agreed price, private
  notes, contact override, and payment reference.
- `reviews`: belongs to a vendor; normal reviews belong to the author's wedding; development seed
  reviews may have no wedding and are immutable. Stores four 1-5 dimensions, choose-again boolean,
  text, reviewer display name, publication flag, and timestamps. Rating summaries are queried from
  reviews rather than stored as a second source of truth.

### Planning and money

- `tasks`: belongs to a wedding; title, notes, category, due date, priority, status, timestamps.
  Wedding Timeline is a query/view of these rows and never duplicates tasks.
- `budget_items`: belongs to a wedding and optionally a `couple_vendors` row; label/category,
  estimated amount, committed amount, notes, timestamps.
- `payments`: belongs to a budget item; label, amount, due date, paid state/date, notes, timestamps.

### Assistant

- `assistant_threads`: belongs to a wedding; title and timestamps.
- `assistant_messages`: belongs to a thread; role, content, source labels, optional structured action
  proposal, timestamps.
- `assistant_action_proposals` (second priority): belongs to a wedding/thread; validated action type,
  arguments, expiry, and pending/confirmed/cancelled state. Execution always re-authenticates and
  revalidates the arguments.

### Wedding Helper (second priority)

- `helper_links`: hashed high-entropy token, wedding, expiry/revocation, access level.
- `helper_shared_items`: explicit allowlist of shared operational records/fields. Financial and
  private account data are not queryable through helper policies.

### Deletion rules

- Deleting an Auth user cascades to its profile and owned wedding/vendor profile.
- Deleting a wedding cascades to tasks, couple-vendor relations, budget data, reviews authored by
  that wedding, assistant data, and helper grants.
- Deleting a vendor cascades to its images/relations/reviews; booked financial rows use `SET NULL`
  for the vendor relation so the couple's historical budget remains intact.
- Category/subcategory deletion is restricted when vendors reference it.

## 6. Authentication, authorization, and RLS

- Couple and Vendor use separate forms but the same Supabase email/password authentication.
- Signup metadata is used only to initialize the non-privileged `couple` or `vendor` profile; RLS
  authorization reads the database role/ownership, not editable user metadata.
- A database trigger creates the profile and the initial wedding or vendor profile atomically.
- Root and protected layouts redirect based on verified session plus database profile role.
- Proxy refreshes sessions but does not replace authorization or perform slow data fetching.
- Public grants are limited to published vendor/category/image/review reads.
- Couple policies require the authenticated user to own the referenced wedding for every read/write.
- Vendor policies allow a vendor to mutate only its own profile/images and never reviews.
- Ownership IDs are derived from the verified session or checked through RLS; client-supplied IDs
  alone are never trusted.
- Storage policies allow public reads of published vendor media and owner-only writes below the
  vendor's UUID path.
- RLS tests cover both allowed and denied cross-user operations.

## 7. Migrations, indexes, and seed strategy

Migrations are reproducible SQL under `supabase/migrations/`:

1. extensions, enums, taxonomy, tables, constraints, triggers, and helper functions;
2. grants, table RLS policies, and Storage bucket policies;
3. a nullable, indexed marketplace city field required by the existing location requirement;
4. later, helper and confirmed assistant-action tables if second-priority work begins.

`supabase/seed.sql` is generated from `scripts/generate-marketplace-seed.mjs` together with the local
fallback JSON, statistics, and one checked-in SVG per fictional vendor. It contains 432 vendors
(36 venues and 22 in each other detailed subcategory) plus 2,380 marked seed reviews. IDs, review
dates, profiles, and images are deterministic; five `ON CONFLICT` upserts make identical repeated
execution non-duplicating without deleting user-owned data. It contains no real vendor identities,
secrets, production Auth accounts, or external image dependency.

Indexes:

- unique lowercase vendor slug and unique owner IDs;
- `tasks(wedding_id, status, due_date)`;
- `couple_vendors(wedding_id, status)` and `(vendor_id)`;
- `budget_items(wedding_id)` and `payments(budget_item_id, is_paid, due_date)`;
- `reviews(vendor_id, is_public, created_at desc)`;
- `vendor_profiles(is_public, category_id, subcategory_id)` plus GIN indexes for service areas,
  styles, event types, and services; price/capacity indexes support category filters.

Vendor results and reviews are paginated. Public and private queries remain separate.

## 8. Server Actions versus Route Handlers

Use Server Actions for sign-up/login/logout, wedding details/setup, task CRUD, couple-vendor status,
budget/payment mutations, reviews, and vendor profile metadata. These are internal form operations;
Actions keep validation and mutation close to the rendered route without inventing a parallel API.

Use Route Handlers only for:

- `/auth/callback`: an HTTP redirect target is inherent to PKCE authentication;
- `/api/assistant`: a clear service boundary is useful for streaming/provider calls, tool dispatch,
  source metadata, and later confirmed action execution;
- vendor binary upload only if direct authenticated Storage upload proves insufficient. The preferred
  first implementation uploads to Storage with the user's session and records metadata by Action.

No redundant CRUD REST layer is added.

## 9. Component and folder structure

```text
app/
  (public)/                 landing, auth, marketplace, vendor profile
  (couple)/                 protected couple pages and layout
  (vendor)/                 protected vendor pages and layout
  api/assistant/            assistant HTTP boundary
  auth/callback/            PKCE exchange
components/
  ui/                       small accessible primitives
  layout/                   public header, couple sidebar, vendor sidebar, mobile nav
  wedding/                  dashboard, setup, details, timeline
  tasks/                    task form/list/status controls
  vendors/                  search/filter/card/profile/status/review/gallery
  budget/                   summary, item/payment forms and tables
  assistant/                conversation, sources, proposed-action confirmation
lib/
  supabase/                 browser, server, proxy clients and generated DB types
  auth/                     verified user/role helpers
  actions/                  Server Actions grouped by domain
  domain/                   pure recommendation, budget, timeline, wedding-week logic
  queries/                  scoped server reads and dashboard projections
  assistant/                provider interface, local provider, context tools, schemas
  validation/               shared Zod schemas
supabase/
  migrations/               schema and policy history
  tests/                    pgTAP/RLS tests
  seed.sql                  deterministic marketplace demo data
tests/                      Vitest unit/integration tests
e2e/                       Playwright critical flows
docs/                       required course documentation and presentation guide
```

## 10. State management

- Supabase/server data is the source of truth.
- Server Components load initial state and summaries.
- URL search parameters own vendor search, category filters, sorting, and pagination.
- Native forms/Server Actions with `useActionState` own mutation feedback.
- Local React state owns setup step navigation, open dialogs, upload progress, and unsaved local input.
- No Redux, global cache, or separate API state library is introduced for the MVP.

## 11. Vendor taxonomy

High-level groups stay compact in navigation:

- Venues: wedding venues/gardens.
- Photography & Content: photographers, videographers, magnet photographers, social content.
- Music & Entertainment: DJs, attractions, photo booths.
- Beauty & Attire: wedding dresses, suits, makeup and hair.
- Design & Flowers: event/chuppah design, flowers, invitations, guest gifts.
- Event Services: transportation, rabbis/officiants, event managers, hotels/preparation locations.

Taxonomy rows are seeded and referenced by foreign key. Category-specific filter components use
typed vendor fields; the project will not create an opaque universal dynamic-filter engine.

## 12. Deterministic “Recommended for you” algorithm

Only available evidence is scored. Weights are:

- service area matches preferred area: 25;
- vendor price range fits the wedding's currently uncommitted budget: 20;
- at least one wedding style overlaps: 20;
- guest count is within capacity: 15;
- event type is supported: 10;
- rating quality: 10 (full at 4.5+, partial at 4.0+).

`score = earned applicable weight / total applicable weight * 100`.

A label appears only when at least two substantive dimensions are applicable and the normalized score
is at least 75. Rating alone can never qualify a vendor. “Flexible” area counts as compatible. Missing
data neither helps nor hurts. The UI may show concise reasons such as “Serves Central Israel” and
“Fits 250 guests”; it never hides lower-scoring vendors. Pure unit tests cover thresholds, missing
data, boundary capacities, budget exhaustion, flexible areas, and deterministic ordering.

## 13. Budget and payment logic

- `projected = sum(committed_amount when present, otherwise estimated_amount)`.
- `committed = sum(committed_amount)`.
- `paid = sum(payment.amount where paid = true)`.
- `available = total_budget - committed` (may be negative and shown as over budget).
- `remaining_committed = max(committed - paid, 0)`.
- `upcoming = unpaid payments ordered by due_date`, with undated payments after dated ones.

Server validation rejects negative money, paid dates on unpaid rows, payments above the remaining
commitment, and cross-wedding references. Booking a vendor does not silently create a budget item;
the UI offers an explicit, confirmed “add agreed price to Budget” action.

## 14. AI Wedding Assistant

### Provider abstraction

`WeddingAssistantProvider.respond({ messages, context, tools })` returns answer text, source labels,
and an optional validated action proposal. The default `LocalWeddingAssistantProvider` requires no
key and supports:

- real task, booked-vendor, open-category, budget, and payment summaries;
- deterministic comparison of saved/considered vendors;
- a curated set of clearly labelled, non-time-sensitive wedding knowledge answers;
- graceful notices when personal context or current web research is unavailable.

An external adapter is not enabled or billed by default. Any future provider key is server-only and
never uses a `NEXT_PUBLIC_` name.

### Context tools

- `getWeddingDetails`
- `getTaskSummary` / `getTasksInRange`
- `getBudgetSummary` / `getUpcomingPayments`
- `getCoupleVendors`
- `searchInternalVendors`
- `compareVendors`

Each tool derives the wedding from the authenticated user, selects only needed columns, and labels
facts as Couple data or Internal vendor database. Current external claims require a configured web
research provider and concise sources. Missing context is stated, never invented.

Significant writes are second priority. The assistant first creates a structured proposal, shows the
exact change, and mutates only after explicit confirmation through a separate authenticated request.

## 15. Validation and error handling

- Shared enums and Zod schemas validate email, Israeli/international phone formats, dates, guest
  counts, money, ratings, URLs, categories, assistant inputs, and action arguments.
- Database checks repeat invariant enforcement for ranges and mutually dependent fields.
- Expected failures return field-level or form-level messages; unexpected failures are logged without
  secrets and shown as a neutral retry message.
- `not-found.tsx`, protected-route redirects, loading states, error boundaries, and empty states are
  product-specific.
- Missing Supabase configuration shows a setup notice on affected local routes while the public
  landing and build remain stable.
- Uploads validate ownership, MIME type, extension, and size; failed metadata writes are reported.

## 16. Testing strategy

- **Vitest:** recommendation scoring, budget formulas, task completion percentage, timeline grouping,
  Wedding Week detection, profile completion, validation, assistant intent/tool contracts, provider
  fallback, and confirmation-state logic.
- **Component tests:** important empty/error/form states and accessible interaction where pure logic
  tests are insufficient.
- **Supabase pgTAP/SQL:** constraints, ownership helpers, anon public reads, couple isolation, vendor
  owner-only edits, review immutability, and storage policies.
- **Playwright:** public landing/marketplace; couple signup/login, setup skip/complete, details, tasks,
  timeline, vendor status, budget, and assistant flow; vendor signup/profile; guest/private-route and
  cross-user denial.
- **Manual checks:** responsive navigation, keyboard use, image upload, email confirmation behavior,
  production environment configuration, and the complete presentation demo flow.

After each major phase: lint, typecheck, relevant tests, then production build at integration points.
Tests requiring a local/remote Supabase instance are clearly separated and never reported as passed
unless actually run.

## 17. Security considerations

- RLS plus least-privilege grants on all exposed data; UI hiding is not authorization.
- Cookie-based SSR auth and verified `getUser()`-style checks for protected server operations.
- No service-role key in the app's normal request path.
- Zod validation, database constraints, safe query builders, and escaped React output.
- Rate/length limits on assistant messages and uploads; no secrets or private context in logs.
- Public vendor queries expose an explicit column set and never private couple notes.
- Storage paths are owner-scoped; accepted image types and sizes are limited.
- Helper tokens, if implemented, are high-entropy, hashed at rest, short-lived, revocable, and
  field-limited.
- `.env.local`, passwords, database connection strings, service-role/secret keys, and provider keys
  remain ignored and never enter chat or Git.

## 18. Scalability considerations

The MVP targets dozens to hundreds of users. Indexed, paginated, server-side queries avoid shipping
whole tables to browsers. Dashboard reads fetch summaries/limited upcoming rows; assistant context is
assembled per question rather than dumping the database into a model. Images use responsive Next.js
delivery and bounded dimensions. Public marketplace filters remain SQL-side.

Known future improvements include materialized/denormalized rating summaries at higher volume,
background image processing, stronger assistant rate limiting/queues, audit logging, cached public
vendor search, cursor pagination, observability, and connection-pooling review. These are not added
prematurely.

## 19. Vercel deployment plan

1. Complete and verify local implementation and migrations.
2. User enters the existing Supabase project's public URL and publishable key in `.env.local`.
3. Apply reviewed migrations and seed only to the existing project, then verify RLS with two couple
   users, one vendor user, and a guest session.
4. User imports the existing GitHub repository into Vercel (no alternate host).
5. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel project
   settings for Production and Preview. Any future AI key is secret and server-only.
6. Configure Supabase Auth site URL and allowed callback URLs for the Vercel production/preview URLs.
7. Run production smoke/E2E checks and record the final Vercel/GitHub links in submission docs.

## 20. Ordered implementation phases

1. **Foundation:** scaffold Next.js/TypeScript, visual tokens, Supabase clients, Auth, role-aware layouts,
   schema migrations, grants, RLS, environment placeholders.
2. **Couple core:** signup/login, skippable setup, editable Wedding Details, real Dashboard summaries,
   Tasks CRUD, Timeline.
3. **Vendors:** taxonomy, seed marketplace, search/filter/pagination, public profiles, statuses,
   My Vendors, reviews, deterministic recommendations.
4. **Budget:** exact calculations, expense/payment CRUD, Dashboard integration.
5. **Vendor account:** signup/login, Dashboard, owner-only profile/gallery/services management.
6. **Assistant:** scoped context retrieval, local provider, missing-context behavior, vendor comparison,
   curated knowledge, optional-provider boundary.
7. **Hardening:** tests, permission review, validation/error/accessibility/responsive polish, lint,
   typecheck, full test run, production build.
8. **Second priority after stability:** detailed schedules, confirmed assistant writes, Wedding Week,
   then helper access.
9. **Documentation/deployment handoff:** technical design, test specification, security, scalability,
   local run guide, architecture explanation, presentation outline, and exact Vercel/Supabase steps.

Implementation proceeds locally in this order. Remote database application and deployment wait for
the user's explicit dashboard/credential steps; all other work continues autonomously.
