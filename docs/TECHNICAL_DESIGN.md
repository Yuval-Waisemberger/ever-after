# Detailed Technical Design

> Agent architecture: [AI Agent Specification](AI_AGENT_SPEC.md) is authoritative for the current Phase 1A contract and future Agent direction.

## 1. Product boundary

Ever After has three ordinary user experiences: a shared Couple account, a Vendor business account,
and a public Guest marketplace. The Couple's `weddings` row is the ownership root for private
planning data. Vendor profiles are public only when explicitly published. Wedding Helper and
confirmed Assistant writes remain second-priority work and are not represented as complete features.

One source of truth is enforced throughout:

- Wedding Details owns wedding facts and preferences.
- Tasks owns planning actions; Timeline is a derived view of dated Tasks.
- Vendors/My Vendors owns relationship status and private vendor notes.
- Budget owns expenses and payments; Dashboard only summarizes them.
- Reviews live on Vendor Profiles.

## 2. Runtime architecture

Next.js App Router provides UI and backend capabilities in one deployable application. Public pages
can render without a session. Protected route-group layouts verify the Supabase user and database
role, then wrap pages in a role-specific shell. Server Components fetch page data. Client Components
are restricted to interactive forms, filters, wizard navigation, upload progress, and chat state.

`src/proxy.ts` refreshes Supabase cookie sessions; it is not treated as authorization. Every database
operation also passes through grants, RLS, foreign keys, and checks. The production app is deployed
to Vercel; data, Auth, and vendor media stay in the existing Supabase project.

## 3. Routes

| Route | Audience | Responsibility |
|---|---|---|
| `/` | public | Landing and authenticated role redirect |
| `/auth/couple`, `/auth/vendor` | public | Separate login/registration paths |
| `/auth/callback` | public | Supabase PKCE code exchange |
| `/vendors`, `/vendors/[slug]` | public | Searchable marketplace and public profile/reviews |
| `/wedding` | Couple | Main Dashboard summaries and Wedding Week emphasis |
| `/wedding/setup` | Couple | Five-step optional/skippable personalization |
| `/wedding/details` | Couple | View/edit the wedding's stored facts |
| `/wedding/timeline` | Couple | Derived view of dated Tasks |
| `/tasks` | Couple | Task CRUD/status/priority/date management |
| `/vendors/my` | Couple | Saved/contacted/considering/booked/rejected relationships |
| `/budget` | Couple | Total, expenses, payment schedule, paid history |
| `/assistant` | Couple | Grounded chat and vendor comparison |
| `/api/assistant` | Couple | Validated assistant HTTP/provider boundary |
| `/settings` | Couple | Account context and logout |
| `/vendor` | Vendor | Completion, rating, and recent-review summary |
| `/vendor/profile` | Vendor | Business fields, matching attributes, gallery |
| `/vendor/explore` | Vendor | Marketplace entry |
| `/vendor/settings` | Vendor | Account context and logout |

There is intentionally no standalone Dashboard, Wedding Profile, Compare, Reviews, Payments, or
Wedding Week navigation item.

## 4. Data model

### Ownership graph

`auth.users -> profiles -> weddings -> {tasks, couple_vendors, budget_items, assistant_threads}`

`profiles(vendor) -> vendor_profiles -> {vendor_images, received reviews}`

`budget_items -> payments`; `assistant_threads -> assistant_messages`; `couple_vendors` joins one
wedding and one vendor. Review authorship points to a wedding, except immutable `is_seeded` demo
reviews. Deletions cascade through private workspace children; deleting a couple-vendor relationship
sets the optional budget link to null to retain financial history.

### Key constraints

- One profile per Auth user; one wedding per Couple owner; one vendor profile per Vendor owner.
- One couple-vendor relationship per `(wedding_id, vendor_id)`.
- One non-seed review per `(wedding_id, vendor_id)`; PostgreSQL permits multiple seed rows because
  their `wedding_id` is null.
- Ratings are 1–5; money and guest counts are non-negative/positive as appropriate.
- Price/capacity lower bounds cannot exceed upper bounds.
- Venue name is allowed only for a booked venue state.
- An image has exactly one source: Storage path or a URL. Seeded URLs point to checked-in local WebPs;
  Vendor-account uploads continue to use Supabase Storage.

Money is stored as integer agorot (`*_minor`). Dates that are calendar facts use PostgreSQL `date`;
audit timestamps use `timestamptz`.

## 5. Authentication and authorization

Both roles use Supabase email/password Auth. Signup metadata initializes a role-specific database row
through `handle_new_user()`: a Couple gets a profile plus wedding; a Vendor gets a profile plus vendor
profile. Authorization never relies only on mutable Auth metadata. Database policies derive ownership
through `auth.uid()` and the stored role/owner relationships.

Guests receive public-category, published-vendor, media, and public-review reads only. Couples can
access only their wedding graph. Vendors edit only their owned business and media; reviews remain
read-only to vendors. See `docs/SECURITY.md` and the second migration for the full policy matrix.

## 6. Server Actions and Route Handlers

Server Actions handle internal form mutations: authentication, Wedding Setup/Details, Tasks,
couple-vendor status, reviews, Budget/Payments, and Vendor Profile/gallery metadata. Each action
validates on the server, obtains the verified ownership context, performs a scoped mutation, and
revalidates affected pages. This avoids a redundant REST layer.

Route Handlers are used where HTTP is the natural boundary:

- Auth callback exchanges an externally supplied PKCE code and redirects.
- Assistant POST accepts JSON, validates length/shape, loads RLS-scoped context, selects a provider,
  stores the user/assistant messages, and returns a source-labelled response.

Binary vendor images upload directly to Supabase Storage with the authenticated user's session;
server actions validate and register/delete their metadata.

## 7. Components and state

`src/components/ui` contains small reusable fields/buttons/empty states. Feature components are split
among `wedding`, `tasks`, `vendors`, `budget`, `vendor`, and `assistant`. Layout components own the
public header and compact role-aware navigation. `src/lib/domain` contains pure, testable business
rules; `queries` contains server reads; `actions` contains mutations; `validation` contains Zod
boundaries; `supabase` contains SSR/browser/proxy clients.

The server/database is the source of truth. URL parameters own marketplace filters and pagination.
`useActionState` owns form feedback. Local state owns only transient wizard/chat/upload interaction.
There is no Redux or client-side server cache.

## 8. Vendor taxonomy and discovery

High-level groups are Venues, Photography & Content, Music & Entertainment, Beauty & Attire, Design
& Flowers, and Event Services. Seeded subcategories implement the exact detailed types from the
specification. Search, category, subcategory, service area, price, rating, capacity, Friday
availability, and service filters remain explicit and understandable. Booked categories are never
removed from marketplace results.

The no-credential local state imports the generated typed fallback that is produced from the same
source as `supabase/seed.sql`; it is not the deployed source of truth. Connected environments query
only published vendors and paginate 12 per page. Search covers business name, city, and description;
subcategory/category, area (including nationwide vendors), price, rating, capacity, Friday, and
service filters use the same generated attributes.

## 9. Recommendation algorithm

The algorithm is deterministic and never hides vendors. Applicable evidence receives these weights:
area 25, available-budget compatibility 20, style overlap 20, guest capacity 15, event type 10, and
rating quality 10. Missing evidence is removed from the denominator. A badge requires at least two
substantive applicable dimensions and a normalized score of at least 75. Rating alone cannot qualify.
The returned reasons explain the strongest matches. Pure tests cover positive, insufficient-context,
and non-match cases.

## 10. Budget and payment rules

For every budget item:

- projected contribution = committed amount when set, otherwise estimated amount;
- committed contribution = committed amount or zero;
- paid contribution = sum of its paid payments.

Workspace totals are `projected`, `committed`, `paid`, `available = total - committed`, and
`remaining committed = max(committed - paid, 0)`. Negative `available` is intentionally retained to
show an over-budget state. Unpaid dated payments sort before undated payments. A payment cannot make
the scheduled payment sum exceed its item's committed amount. Booking a vendor never silently creates
an expense; the couple makes that financial decision explicitly.

## 11. Wedding Assistant

`WeddingAssistantProvider` is a server-only interface returning text, source labels, and an optional
future action proposal. The configured `local` provider requires no API key. It reads actual Wedding
Details, Tasks, vendor relationships, price/services/reviews, Budget, and upcoming Payments. It can
summarize work, answer budget/booking questions, compare selected vendors, and provide a curated set
of stable general-wedding answers. Missing personal context is named, never invented.

Current external research is intentionally unavailable without an explicitly selected provider. The
local provider says so for time-sensitive requests. Significant database writes from chat are not
executed; the provider contract reserves structured proposals for a later confirmed-action flow.

## 12. Errors and validation

### Assistant internal READ tools (Phase 1B, 2026-09-07)

The authoritative current Agent contract is [AI_AGENT_SPEC.md](AI_AGENT_SPEC.md). The small
`src/lib/assistant/tools` layer contains `contracts.ts` (Zod inputs/results and limits), `server.ts`
(fresh authentication, scoped execution and checked reads), `planning.ts` (seven planning tools),
`vendors.ts` (three vendor tools) and `registry.ts` (the exact ten-name read allowlist). This layer
is server-only through its `next/headers` dependency and exposes no new HTTP endpoint.

Future flow: a provider requests an allowlisted name and arguments → Ever After validates them →
verifies the current Couple session and owned wedding → executes a fixed scoped read → validates
and returns data/evidence or a safe unavailable result → the provider reasons over that result.
Only Ever After's server query layer holds the Supabase client. Provider adapters must not query it.
No model loop, provider-specific JSON, research tool or product mutation executor is implemented.

The tools are `get_wedding_summary`, `list_tasks`, `get_timeline_summary`, `get_budget_summary`,
`get_upcoming_payments`, `get_couple_vendors`, `search_marketplace_vendors`, `compare_vendors`,
`get_guest_list_summary` and `get_missing_wedding_details`. The spec documents exact inputs,
outputs, source kinds and per-tool bounds. Success and genuinely empty reads carry evidence;
unavailable reads carry a safe error and no data. Missing facts remain null.

Tasks/Timeline default to 25/max 50 per page; vendor pages default to 12/max 20; comparisons accept
2–4 distinct public IDs; unpaid payments default to 10/max 20 per overdue/upcoming/undated group.
Aggregates process batches of 500 with explicit caps: 10,000 Budget-item, payment or Guest rows per
collection, 5,000 numerical review rows for selected vendors, and 1,000 Couple-vendor identities.
A sentinel detects overflow; incomplete totals/ratings become unavailable, not partial facts.

Budget, Guest counts, relative task dates, setup completion and recommendation weights/reasons
reuse existing domain functions. The Phase 1A payment classifier now preserves entry metadata and
shares the Israel-calendar date helper; overdue/upcoming semantics remain unchanged. Comparison
withholds a personalized score when fewer than two substantive matching dimensions are known.

Marketplace uses narrow public reads without UI demo fallback or raw review collections. Most
filters execute in PostgREST; minimum rating uses a deterministic scan because there is no stored
aggregate rating column. All other filters apply on every chunk, ordered by business name then ID.
The scan counts only qualifying vendors toward the page and one filtered lookahead; `hasMore`
describes filtered results. It processes at most 50 candidates per chunk and 1,000 per invocation,
with one raw sentinel per query to prove exhaustion (at most 1,001 distinct candidate rows read).
Only the final page reaches the provider. The existing 5,000 numerical-review cap applies per
chunk. Failure to prove lookahead or exhaustion within the cap returns unavailable without data,
even if some page entries were found. No-match empty results require exhaustion; pages beyond
the end are empty with `hasMore: false`. Stable pages assume unchanged source data between calls.
Couple-vendor category filtering combines
at most 1,000 scoped identities before paging and hydrates only the selected page. Separate reads
are not a transactional snapshot. These are documented limitations, not a new schema design.

Compatibility: `/api/assistant`, `runWeddingAgent`, `getAssistantContext` and the Local provider
still use the Phase 1A monolithic wedding/tasks/vendors/budget/Guest aggregate bundle. No provider
loop or automatic tool routing is added. That bundle retains its existing failure/privacy guards
and does not inherit the new tools' bounds. Future orchestration must select relevant tools and
enforce domain scope, call counts, timeouts and context/rate budgets before enabling a real LLM.

Zod validates auth forms, text lengths, enums, dates, counts, prices, URLs, ratings, relationship
statuses, and assistant JSON. PostgreSQL repeats durable constraints. Expected failures become
plain-language messages; React escapes rendered text. Missing Supabase variables leave the public
landing and demo marketplace usable and make private/auth actions fail safely with setup guidance.

## 13. Current limitations

The application code and migrations are complete locally but the migrations have not been applied to
the remote project in this implementation pass, so connected account/database flows still require the
user's local/dashboard configuration and integration testing. Helper access and confirmed Assistant
writes remain second priority. After-wedding/community features remain third priority. Real payment
processing, calendars, WhatsApp, RSVP, seating, invitation sending, vendor messaging, and real-time
availability are deliberately out of scope.
