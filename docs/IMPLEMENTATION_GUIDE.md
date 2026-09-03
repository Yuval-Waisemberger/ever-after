# Implementation and Architecture Guide

## How to explain the system

The shortest accurate explanation is: the verified user determines a database ownership root, RLS
protects every row beneath that root, Server Components read it, and Server Actions validate/mutate it.
Derived views such as Dashboard, Timeline, recommendations, and Assistant answers reuse those same
records rather than maintaining parallel copies.

## Follow one feature end to end

### Task flow

1. `/tasks` calls the scoped query in `src/lib/queries/tasks.ts`.
2. The Couple's wedding is derived from the authenticated session, not accepted as a trusted form ID.
3. `TaskForm` submits to `saveTask`.
4. `taskSchema` validates title, category, notes, date, status, and priority.
5. Supabase applies table grants, the `tasks` RLS policy, constraints, and foreign keys.
6. The action revalidates Tasks, Wedding Dashboard, Timeline, and Assistant.
7. Timeline groups the same task rows in `src/lib/domain/timeline.ts`; there is no timeline table.

This pattern repeats for Wedding Details, relationship statuses, Budget, and Vendor Profile data.

### Marketplace/recommendation flow

Filters are parsed from URL search parameters, translated into explicit SQL filters, and paginated.
Published vendors are mapped into one typed card/profile model. When the viewer is a Couple, the
server loads available Wedding Details and budget context, then calls the pure recommendation
function. The function removes missing dimensions from the denominator, requires meaningful evidence,
and returns score/reasons. The UI adds a badge but never filters out a non-recommended vendor.

### Budget flow

Expenses store estimated and/or committed values. Payments belong to an expense. Pure calculation
code produces summary totals, while Server Actions reject invalid amounts and payment schedules that
exceed commitment. Dashboard reads the same calculation, so its numbers cannot drift from Budget.

### Assistant flow

The client posts only the user's message and optional thread ID. The server verifies the Couple,
loads that wedding's minimal context through RLS, and passes it to `WeddingAssistantProvider`. The
local provider recognizes grounded intents and comparison/knowledge questions. It returns a response
plus source labels. Both messages are saved under the owned thread. No private context is sent to a
third party and no write action is executed in the current version.

## Important design choices

- Server Actions instead of a CRUD REST API keep internal form mutations small and typed.
- The assistant uses a Route Handler because chat/provider calls benefit from a clean JSON boundary.
- The database is the source of truth; local state is temporary UI state only.
- Integer minor currency units avoid floating-point rounding.
- Deterministic matching is explainable/testable and is not mislabeled as AI.
- Demo marketplace fallback preserves a useful public preview without pretending private features
  work before Supabase is configured.
- The default local Assistant meets graceful-degradation and no-paid-provider requirements.
- Reproducible migrations replace dashboard-created ad-hoc tables.

## Adding a field safely

For a new durable field: confirm it exists in the source requirements; add a migration/constraint and
RLS impact; update server query/mutation types; add Zod validation; render it only in its source-of-
truth screen; update dependent summaries/Assistant context only when necessary; add positive and
invalid/cross-owner tests; update the technical/security/test docs.

## Do not accidentally break these invariants

- Never take `wedding_id`/owner IDs from the client as authorization.
- Never expose private notes in public vendor queries.
- Never add a second timeline, payments, reviews, or comparison source of truth.
- Never show a recommendation badge with insufficient wedding context.
- Never let a Vendor modify Couple-authored reviews.
- Never put provider/service-role/secret keys in client code or `NEXT_PUBLIC_*`.
- Never execute an Assistant write without a separate explicit confirmation flow.
- Never enable billing or switch from Vercel/Supabase without approval.

## Current handoff boundary

Local code, SQL, seed, domain tests, and course documentation are prepared. The user must enter the two
public Supabase values locally and apply the reviewed migrations to the existing project before real
account/database/RLS integration can be exercised. That external step must precede claims that the
remote-backed demo flow passes.
