# Test Specification

> Current Assistant foundation coverage and boundaries: see [AI Agent Specification](AI_AGENT_SPEC.md) and tests/assistant/.

## Objectives

Testing must demonstrate core correctness, invalid-input handling, important product flows,
permissions, database behavior, edge cases, and basic UI behavior. A test is reported as passed only
when it actually ran in the relevant environment.

## Automated unit/provider tests

| Area | Required assertions | Current automated coverage |
|---|---|---|
| Recommendation | weighted score, evidence threshold, no badge with insufficient data | `tests/domain/recommendation.test.ts` |
| Budget | projected/committed/paid/available formulas, payment ordering | `tests/domain/budget.test.ts` |
| Tasks | open/due-this-week/completed percentage, empty list | `tests/domain/tasks.test.ts` |
| Timeline | relative grouping, absolute dates without wedding date, no duplication | `tests/domain/timeline.test.ts` |
| Wedding countdown | normal/final-week/tomorrow/day/post-wedding states; development preview only | `tests/domain/wedding-week.test.ts` |
| Vendor profile | deterministic completion percentage/next steps | `tests/domain/vendor-profile.test.ts` |
| Local Assistant | grounded task answer and missing-context/general behavior | `tests/assistant/local-provider.test.ts` |
| Marketplace seed | taxonomy/counts, deterministic IDs, ranges, review consistency, local images, idempotent SQL shape | `tests/seed/marketplace-dataset.test.ts` |

Vitest discovers only `tests/**/*.test.ts(x)` so Playwright specs are not accidentally executed by a
second runner. Use the current Vitest runner output for exact test totals; historical phase counts are not the
current suite size. Current commands and fixture/database entry points are documented in README.

## Browser tests

`e2e/public.spec.ts` verifies the logged-out entry paths, seeded guest marketplace/profile flow,
pagination/filtering, successful browser decoding for all 291 unique pooled/dedicated WebPs (including named
representatives from 15 requested subcategories), and the private Couple-route redirect without configuration.
Additional connected-environment Playwright
cases should cover:

1. Couple registers, confirms email if enabled, completes or skips setup, and lands on My Wedding.
2. Returning Couple bypasses the landing page.
3. Partial Wedding Details save and display as Not set where appropriate.
4. Task create/edit/status/date/delete updates both Tasks and Timeline.
5. Couple searches/filters vendors, views a public profile, and changes relationship statuses.
6. Two considered photographers are compared by the Assistant using stored facts.
7. Booking appears in Our Vendors and Dashboard; database-owned canonical commitments and actual payments calculate correctly.
8. Vendor registers, edits only its profile, uploads/removes an image, and sees review summaries.
9. Guest can browse published profiles but receives no private workspace data.
10. Only the existing date area changes during the final week; normal Dashboard cards remain once each.

## Database/RLS tests

After applying migrations to an isolated local Supabase test stack, create anonymous, Couple A,
Couple B, Vendor A, and Vendor B sessions. Verify:

- anonymous can read taxonomy and published vendors/reviews but not unpublished/private tables;
- Couple A can read/update its wedding, tasks, statuses, budget, payments, reviews, and assistant data;
- Couple A cannot read or mutate Couple B rows even with known UUIDs;
- Vendor A can update only Vendor A profile/images and cannot edit any review;
- status/review uniqueness, price/capacity bounds, rating ranges, and image-source checks fail safely;
- a forged budget item, payment, review, or assistant-thread parent ID is rejected;
- storage upload/delete is owner-folder-only;
- canonical deletion/reparenting protections and RESTRICT foreign keys preserve financial history.

`supabase/tests/rls.test.sql` checks schema/RLS and the final policy inventory, including role
restrictions and both media buckets. The maintained isolated PostgreSQL security runner executes
the actual migrations and an identity-based SQL policy matrix. Supabase JWT and Storage HTTP
adversarial verification remain Final Production QA; SQL stubs do not replace those layers.

## Validation and error cases

- invalid email/password confirmation and missing required registration fields;
- invalid dates, negative/oversized money, zero/negative guest capacity, inverted ranges;
- payment schedules exceeding commitment;
- rating outside 1–5 and review text over limit;
- invalid URL/category/status/UUID values;
- assistant empty/oversized JSON, missing provider, and provider/database failure;
- missing Supabase public configuration;
- unsupported or larger-than-5-MB vendor image;
- missing rows, permission denial, and expired session.

## Manual quality checklist

- Keyboard through landing, forms, sidebar/mobile nav, filters, gallery, and chat.
- Confirm visible focus, label association, error announcements, alt text, readable contrast.
- Test mobile widths, tablet, desktop, long names, empty states, and over-budget state.
- Verify setup can be skipped and resumed; booked categories remain browsable.
- Verify no fake Dashboard data and no inaccurate relative timeline without wedding date.
- Execute the current presentation flow in PRESENTATION_OUTLINE.md; the final Product Specification is submitted separately.
- Inspect browser network/server logs for accidental secrets or private over-fetching.

## Running maintained validation

README documents the normal-app E2E command, all five fixture-specific Playwright configs,
the two explicit PostgreSQL runners, pgTAP requirements, unit tests and build commands.
Use current runner output for totals. Dated phase records below describe their original scope,
not the size or deployment status of the current suite.

## Assistant READ-tool validation — Phase 1B

`tests/assistant/tools/read-tools.test.ts` exercises all ten real tool definitions through the
server executor. `database-double.ts` is an in-memory read-only PostgREST double, with no network,
credentials, mutations or actual QA rows. It records selections/filters and models ordering,
pagination, relation reads and failures. Fixtures include extra private fields so output mapping
must remove them even if an upstream read unexpectedly returns extras.

Coverage includes:

- Every tool rejects unauthenticated/Vendor calls and caller-supplied wedding IDs, verifies the
  session anew and scopes private queries to the currently owned wedding.
- The exact ten-name allowlist rejects product writes, research names and prototype keys.
- Minimal Wedding Details and actual missing fields preserve null/zero and venue/setup semantics.
- Task status/priority/date filters, Israel calendar boundaries, page bounds and continuation;
  Timeline derives from Tasks and leaves relative timing null without a wedding date.
- Existing deterministic Budget totals, complete multi-batch reads, errors/null versus real empty
  data, and overdue/upcoming/undated payments with independent bounds and no paid entries.
- Marketplace attribute filters, quoted search input, public visibility and bounded output;
  rating-filtered pagination scans past empty candidate chunks, respects combined filters,
  preserves stable pages without duplicates, and bases `hasMore` only on qualifying vendors.
  No-match exhaustion, exact-cap exhaustion, early lookahead, and scan-cap failures (including
  a full page with unresolved lookahead) are explicitly covered. Intermediate rows remain internal.
- Saved/lifecycle/source/category filters, external-vendor scoping and privacy, unreadable links;
  comparison calls the existing scoring function and exposes actual reasons/missing evidence.
- Guest output contains exactly five counts even with explicit name/phone/email/dietary/private-note
  poison values in fixtures. No individual Guest fields are selected or returned.
- Aggregate and review processing caps fail unavailable without partial totals/ratings. All ten
  tool outputs and query projections are audited for forbidden fields.

Existing Assistant foundation, Local provider, context and API regression suites also remain
required, including the Phase 1A user-message persistence stop and DB-error grounding checks.
Run TypeScript, ESLint, relevant Vitest/application/domain suites, production build and
`git diff --check`. No UI files changed, so Playwright/live browser QA is not required in this
phase. These tests validate server behavior with mocks, not deployed PostgREST/RLS integration.

Results on 2026-09-07: TypeScript and ESLint passed; 225/225 Vitest tests passed across 13 files,
including 105 new tool tests. Production build passed (Next.js 16.3.4, 11 static pages).
`git diff --check` passed. Playwright was not run (no UI changes). Commands used the existing
bundled Node runtime and installed package entrypoints; no dependencies or test accounts/rows were
created. No Supabase integration tests, migrations, writes, external AI or live research were run.

Rating-pagination correction: relevant Assistant Vitest passed 198/198 across five files, including
113 read-tool tests. This replaces the candidate-page limitation test with filtered-search
regressions; the earlier 225-test record above refers to the initial Phase 1B validation selection.
TypeScript, whole-repository ESLint and production build also passed after the correction
(Next.js 16.3.4, 11 static pages), as did `git diff --check` and new-file whitespace checks.

## Phase 1C-A research contracts and policy

`tests/assistant/research.test.ts` covers minimal/invalid benchmark inputs, strict wedding-only
topics, source metadata, successful/partial/unavailable/insufficient results, absent/invented
source references, range/quality constraints and no fabricated local prices/timestamps. Synthetic
minor-unit fixtures are contract test values only, not market guidance or a benchmark dataset.

Policy tests use labelled structured intent examples (they do not claim natural-language routing):
internal facts/comparisons, quote/budget realism, current procedures, ideas/drafting and out-of-scope/
uncertain intent. All six current-claim sensitivity classes reject memory/unavailable/insufficient
verification. Privacy tests verify omitted free-form offer text, rejected identity/contact/notes
keys, coarsened date/count context, procedural minimization and canonical equivalent request keys.

Provenance regressions bind source IDs/metadata/research timestamps to a synthetic trusted receipt
and quote context to the normalized request. Marketplace cannot be relabelled external evidence;
AI recommendation cannot masquerade as Couple data. Multi-source answers retain four classes.
Existing Local research guards remain active, the exact ten-tool registry is unchanged, and the
new modules contain no network/provider/DB-write implementation. Existing Assistant/API/context/
read-tool suites remain part of relevant validation. All fixtures are local; no research or Supabase
integration/mutation is involved. Run TypeScript, ESLint, relevant Vitest, production build and
whitespace checks. Playwright is unnecessary because UI behavior is unchanged.

Results on 2026-09-07: 252/252 Assistant Vitest tests passed across six files, including 54 new
research tests and the 113 existing READ-tool tests. TypeScript (`tsc --noEmit` and build type
checking), whole-repository ESLint and production build passed (Next.js 16.3.4, 11 static pages).
`git diff --check` and separate new-file whitespace/conflict-marker checks passed. No UI changes
or Playwright run. Validation used the existing bundled Node runtime and installed package
entrypoints; no SDK/dependency, external research, Supabase mutation or integration QA rows.

## Phase 1C-B planning / quote / conversation contracts

`tests/assistant/planning.test.ts` covers actual planning facts and evidence, booked Setup/relationship
suppression, preferred and explicitly lower-priority vendor gaps, incomplete/filtered/ambiguous
vendor reads, unavailable financial/Guest sources, overdue/upcoming/completed/undated tasks,
payment classification including today, bounded roadmap windows and omission metadata, fresh dated
snapshots, missing date and post-wedding behavior. It checks Guest/account/vendor/task/payment PII
field removal, stable business names, injected Israel calendar phase boundaries and no negative
countdown. No system clock or live data is modified.

Policy/quote tests cover minimal Guest tool selection, internal budget versus market realism,
scope rejection, missing material package clarification, reuse of known Wedding Details, strict
normalized quote validation, retained package quantities/video false, add-on scope and minimized
research attributes. There is no natural-language extraction or final generated English/Hebrew prose.

Conversation tests cover chronological Unicode messages, whole-message omission, relevance
selection, eight-message/10,000-character limits, provider-unready status, bounded ephemeral vendor/
tool pointers, expiry/scope/authorization refresh and resolved clarification removal. Free-form
chat is not asserted PII-free; these tests prove it is not an outbound provider/research payload.

`tests/assistant/history-server.test.ts` mocks Supabase and checks authentication, Vendor denial,
owned-wedding/thread filters, bounded newest-message reads, cross-thread rejection, query failures,
genuine empty history and lookahead. No live integration calls/QA rows are used. Registry/source
guards preserve ten internal READ tools, inactive research and no Agent writes/external integration.
Run relevant Assistant Vitest, TypeScript, ESLint, production build and whitespace checks; no UI
change means Playwright is unnecessary. Existing Assistant foundation/API/context/read-tool tests
remain required because the provider and compatibility path are intentionally unchanged.

Results on 2026-09-07: TypeScript and whole-repository ESLint passed; 304/304 Assistant Vitest
tests passed across eight files, including 43 planning/quote/conversation tests and nine new
server-history tests. Production build passed (Next.js 16.3.4, 11 static pages). `git diff --check`
and separate new-file whitespace/conflict checks passed. No UI changes or Playwright run.
Tests used mocked data and injected clocks; no Supabase integration/mutation, external service,
package installation, system-clock change, migration, seed or QA data operation was performed.

## Phase 2 bilingual Assistant validation

`tests/assistant/language.test.ts` covers Hebrew/English detection, mixed-language dominance,
ambiguous recent-language fallback, explicit text/UI preferences, real deterministic Hebrew
tasks/budget/Guest/booked summaries, proper names, preserved English behavior, Hebrew scope
redirects, unavailable sections, non-live research with structured clarification and absence of
external detection. Existing context/read-tool privacy tests continue to prove aggregate-only
Guest output and READ-only boundaries. API regressions cover Hebrew response metadata and
safe failed-insert retry metadata without new persistence columns or disconnected generation.

`tests/ui/assistant.test.tsx` checks per-paragraph direction, bidi isolation, composer/role
alignment, accessible controls, source labels, localized clarification and failed-history behavior.
`e2e/assistant-language.spec.ts` mounts the real chat component with real CSS on an isolated
test-only host. It blocks external requests and mocks the API, avoiding Supabase mutation.
Run `pnpm exec playwright test --config e2e/assistant.config.ts` (or the installed CLI with the
bundled Node runtime). The fixture uses installed Vitest/Vite tooling without a new dependency.

The browser matrix includes Hebrew and English conversations at 1440, 1280, 1024, 768, 390,
375 and 360px. Checks cover computed RTL/LTR, role alignment, mixed names/dates/currency,
horizontal overflow, chip/bubble/composer bounds, scrolling, keyboard send, focus restoration
and browser exceptions. A 360px flow also exercises pending/disabled state, safe research
unavailability, clarification, raw-error suppression, failed-insert retry and an empty reply.
Screenshots under ignored `test-results/assistant-visual` are visually reviewed at all widths.
The bounded chat viewport deliberately scrolls; the entire history need not fit onscreen.

These checks cover the component and its page-width wrapper, not a live authenticated AppShell
or real database/provider round trip. Screen-reader announcements use semantic log/status/alert,
labels and source lists; no hardware screen-reader certification is claimed. No broader site
translation, real semantic quote extraction or external model memory is claimed.

Validation record — 2026-09-07: TypeScript (`tsc --noEmit`) and whole-repository ESLint passed.
Relevant Vitest: 330/330 tests across 10 files passed, including 20 language tests, four UI
tests, 15 API tests and all existing Assistant/context/tool/planning/research/history suites.
Playwright Chromium: 15/15 passed. All 14 conversation screenshots were visually inspected;
short dates/currency wrapping was improved and rechecked, including 360px clarification/errors.
Final production build passed (Next.js 16.3.4, 11 static pages; Assistant/API remain dynamic).
`git diff --check` and separate untracked-file whitespace/conflict-marker checks passed.
Commands used installed entrypoints with the bundled Node runtime; native browser/bundler
tools needed sandbox escalation. No package installation or external service was used.
No Supabase data/schema/RLS/migration/seed mutation, commit, push or deployment occurred.


## Booked Vendor → Budget final architecture (050003 applied in Frankfurt)

- `tests/domain/budget.test.ts`: per-item max(commitment, paid), unknown/negative Available,
  preserved paid spending after unbooking, rebooking schedules, independent reconciliation flags,
  multiple payments and remaining committed without cross-expense offsets.
- `tests/application/booked-budget-actions.test.ts`: Marketplace detail/quick book and repeated
  lifecycle writes, price NULL/zero/changes, independent bookmarks, External Vendor failures/deletion,
  owned-wedding scopes, forged canonical fields, safe read/mutation failures and payment history edits.
- `tests/database/booked-budget-migration.test.ts`: SQL SOURCE CONTRACT checks for adoption,
  preconditions, transaction, uniqueness, both vendor types, lifecycle trigger, canonical guards,
  history protections and parent locking. These do NOT execute PostgreSQL or prove concurrent/RLS behavior.
- `tests/ui/budget.test.tsx`: actual Budget page and forms render canonical controls, inactive history,
  safe errors, reconciliation warnings and External Vendor names without a duplicate-link selector.
- Existing Assistant context/read-tool tests verify shared finance consumers exclude inactive
  schedules before lookahead and retain paid impact without expanding their capabilities.
- `e2e/budget-booking.spec.ts` with `e2e/budget.config.ts`: real Budget components on a synthetic,
  isolated Vite host (port 3102), no .env loading/Supabase client, external browser requests blocked.
  Covers unbook/rebook, reduction, form errors, protected inputs, and 1440/768/390/360 widths.

Before live approval, execute the migration in a disposable PostgreSQL database with synthetic
schema/roles and test the following under authenticated owner and non-owner roles: insert Booked
with/without price; add/change/clear price; unbook/rebook same item ID; both vendor sources; adoption
preserves a differing estimate/ID/paid row; duplicates/ambiguous/ownership/partial objects abort;
canonical tampering and External Vendor cascade deletion fail; empty saved placeholder deletion
succeeds; new over-limit payments fail; two concurrent schedule additions serialize; historical
payments survive later reductions and allow annotations. Contract tests alone do not replace this.
No live records may be created for these checks without separate authorization.

Validation record — 2026-09-07: TypeScript and whole-repository ESLint passed. The full Vitest
run passed 600/601 tests; the unrelated local image-pool enumeration timed out under concurrent
build/browser load, then its complete 13-test file passed alone. Four additional External Vendor
cases and the final link changes passed in a 41/41 focused rerun. The final Marketplace finance-consumer tests also passed 9/9 (including two new cases). All 607 current tests therefore
passed across the full run and isolated reruns. Budget Playwright passed 7/7 on the final run;
the first attempt had one fixture-startup timeout under load, with six tests passing.

Production build passed with Next.js 16.3.4 using `next build --webpack`, including TypeScript and
11 static pages. Default Turbopack was attempted twice and failed in its local CSS worker with
`Cannot find module 'node:net'`; parent/child Node diagnostics showed the bundled Node v24 runtime.
Package scripts were not changed. Build process-only Supabase settings pointed to an unreachable
localhost port, never Frankfurt. `git diff --check` and untracked-file whitespace/conflict-marker
checks passed. During the initial implementation run no PostgreSQL engine was available; migration tests were
source contracts only, not SQL execution, concurrency proof or live RLS QA. No migration was applied.

## Wedding Setup → real vendor relationships

This feature uses mocked database clients and isolated browser fixtures only. It does not
apply a migration or exercise writes against Frankfurt. Existing 050003 remains the owner
of booking commitments; the Setup integration does not introduce a financial writer.

- `tests/domain/booking-state.test.ts`: exact mapping against repository taxonomy, multiple
  vendors, confirmed/reported/not-recorded/unknown states, legacy venue metadata, stale
  declarations after unbooking, rebooking and shared optional Setup completion.
- `tests/application/setup-bookings.test.ts`: authenticated Marketplace selection, owned
  relationship reuse, omitted/zero/positive prices, preservation of notes/bookmarks, external
  creation and uncertain outcomes, declaration-only writes, booking-before-cleanup ordering,
  cleanup warnings, category/ID validation, bounded public search, completion, Skip failures,
  field validation, timestamp conflict protection and targeted refresh.
- `tests/application/setup-reads.test.ts`: explicit Couple role/owner scope, minimal relationship
  output, incomplete/error reads, broken references and processing bounds.
- Existing vendor/Budget action tests continue to cover normal lifecycle changes, financial
  history protections and absence of a duplicate application Budget writer. Assistant planning
  and read-tool tests distinguish declarations from confirmed bookings and retain Guest privacy.
- `e2e/setup-bookings.spec.ts`, configured by `e2e/setup.config.ts`, renders the real Setup
  components with synthetic server-action fixtures on port 3103. No environment credentials
  are loaded and external browser requests are blocked. Chromium checks cover autocomplete
  keyboard/touch selection, stale responses, empty results and declaration resolution, uncertain external creation, stale preferences, invalid-step
  focus and retained draft values, Skip bypass/failure, and 1440/768/390/360px overflow checks.

Validation record: 513/513 Vitest tests in 35 application/domain/Assistant/UI files passed.
TypeScript and whole-repository ESLint passed. Isolated Setup Playwright passed 8/8.
Browser testing initially exposed React resetting uncontrolled inputs after a failed action;
controlled draft fields corrected this, and the final browser rerun passed. No live Setup,
vendor, budget or payment QA records were created. Mocked operations do not independently
prove live RLS or database concurrency; existing database protections remain required.

Production build passed with `next build --webpack` (Next.js 16.3.4, 11 static pages;
Setup/Details and authenticated application routes remain dynamic). Process-only Supabase
configuration pointed to unreachable localhost, not Frankfurt. `git diff --check` and new-file
whitespace/conflict-marker checks passed. Package/lockfiles and migrations are unchanged.
No commit, push, deployment or live database mutation was performed for this feature.


Setup autocomplete regression coverage:
- `tests/ui/vendor-typeahead.test.tsx` uses fake timers and deferred responses for minimum
  meaningful characters, debounce resets, service constraints, six-result limit, keyboard
  selection, clearing selection, stale replies, safe errors and pending-search cancellation.
- `e2e/setup-bookings.spec.ts` verifies explicit booking with the selected ID/optional price,
  keyboard and touch selection, empty results, Escape, delayed older responses and long-name
  dropdown bounds at 1440/768/390/360px. Existing external/details-later and Skip checks remain.
- Server booking/search operations and database behavior are unchanged. Existing mocked
  action tests retain coverage for ownership, public taxonomy, relationship reuse and no
  duplicate application Budget/payment writer. QA remains isolated from Frankfurt.

Autocomplete validation: TypeScript and whole-repository ESLint passed without warnings;
119/119 relevant Vitest tests across 13 files and 10/10 isolated Playwright checks passed.
Dropdown screenshots were inspected at all four widths. Production webpack build passed
with unreachable localhost Supabase settings. No Frankfurt writes or migrations occurred.

## Task waiting refinement validation (2026-09-07)

Focused regressions cover four statuses, invalid stored overdue, action DB errors/zero rows,
forged and cross-Couple IDs, actual role/owner resolution with mocked data, no automatic vendor or
financial writes, field errors, retained drafts, complete/reopen/delete, intersecting filters,
waiting as Open, derived overdue and completed exclusion, +0/+7/+8 dates, Israel summer/winter
midnight and Task-derived Timeline with/without wedding date.
Assistant tests cover waiting/overdue English and Hebrew subsets, privacy, ten READ tools and
roadmap follow-up intent with overdue urgency. Task titles are referenced, never interpreted to
invent vendor identity.

Real SQL: `node tests/database/task-status-postgres.mjs` uses the existing `postgres:17` image
(version observed 17.11), executes the repository initial public schema with only an Auth stub,
then the exact new migration. It verifies existing rows byte-for-byte via SQL EXCEPT, enum order,
new status/CRUD/query compatibility, harmless replay, rejection of `overdue`, transactional rollback
on forced error and PostgreSQL's requirement to commit enum DDL before using its new value.
Container and anonymous volume are removed in finally. No Frankfurt test records are created.

Browser: `playwright test --config e2e/tasks.config.ts`, isolated Vite host on 127.0.0.1:3104,
real Task form/rows/filters and Timeline page, synthetic action/query doubles, external requests
blocked, fixed clock. Widths: 1440/768/390/360. Covers two pills, wrapping/overflow, dated/undated
waiting, form selection, keyboard/native controls, quick complete/reopen/edit/delete, combined
filters and safe errors/draft preservation. Screenshots go to ignored test-results only.

Final local run: 531 Vitest tests across 32 files passed; five Playwright tests passed, including
all four responsive widths with the production product stylesheet. Screenshots were visually
inspected. Whole-repository ESLint and production Webpack build passed. TypeScript was checked
separately after generation of Next build types. PostgreSQL 17.11 execution passed and removed its
container/volume. Production build used process-only dummy loopback Supabase configuration.
Browser QA covers isolated components and mocked actions, not authenticated live Frankfurt flows.

Subsequent live closeout on 2026-09-07: Frankfurt preflight passed, and only the exact approved
`202609070001_task_waiting_on_vendor.sql` was applied. Catalog verification confirmed enum ordering
and unchanged Task columns, constraints, indexes, triggers and RLS. All four existing Task IDs and
full-row fingerprints were unchanged (three open, one in progress; none automatically waiting).
Authenticated read-only smoke passed for `/tasks`, `/wedding/timeline`, `/wedding` and `/assistant`:
new form option/filter, independent workflow/deadline pills, Task-derived Timeline and existing
Dashboard metrics rendered without enum/runtime errors. No Task mutation or Assistant message was
submitted, and no QA records were created.


## Simplified date-countdown validation (2026-09-07)

Tests replace the discarded operational-card expectations. Domain cases cover no date, +8/+7/+3/
+1/0/-1, Israel summer/winter and DST transition midnights, fine countdowns, no negative values,
shared roadmap semantics, preview anchoring/validation and production/non-local denial. UI tests
exercise the actual page production guard and verify preview changes only date-area markup while
all six normal cards remain identical and present once. No operational sections render.

The isolated e2e/wedding-week fixture renders the real page with synthetic normal-dashboard data,
mocked read queries/headers, production styling and an injected browser clock. External browser
requests are blocked. Playwright covers all six dated states at 1440/1280/1024/768/390/375/360,
missing date, keyboard focus, compact countdown height, no horizontal overflow and timer rollover
from the day before to Wedding Day. No live wedding date, system clock or Supabase record is changed.

Final result: 141 Vitest tests across 15 files passed, including the actual page production guard.
Eight Playwright tests passed, with six states captured at all seven widths (42 screenshots) and
minute-to-midnight rollover coverage. Screenshots were visually reviewed. Whole-repository
ESLint, final TypeScript, production Webpack build and git diff --check passed. The build used
process-only dummy loopback Supabase configuration. Authenticated localhost previewDaysBefore=3
also rendered successfully with one of each normal card; no data-changing action was submitted.

Later cleanup remains outside this task: long titles in the normal Upcoming card become narrow
beside pills on small screens, and the normal Budget card's “Next payment” heading can describe
an overdue item. Neither normal card was changed in this date-area-only pass.

## Final authorization pass (2026-09-07)

`tests/database/security-rls-postgres.mjs` executes every actual repository migration through the
new role-boundary patch in a disposable PostgreSQL 17 container, with no network/host port, no
production credentials and synthetic identities only. `auth.uid`, auth.users and minimal Storage
catalog tables are SQL boundary stubs; public schema, grants, RLS, FKs and financial triggers are
the actual migrations. Operations run as non-owner authenticated/anon roles, not the superuser.

The harness first reproduces wrong-role wedding/Vendor creation, unpublished-vendor disclosure
through booking sync and the Vendor deletion cascade. It then tests migration rollback, no data
backfill, allowed creation/edit flows, legacy wrong-role denial, Couple A/B read/update/delete/
reassignment isolation, forged inserts, public/Vendor denial, canonical booking protections,
payment-parent immutability, unbook/rebook preservation, image metadata and Storage namespace
checks. Cleanup removes the disposable container and volume in finally. Run with an existing
modern Node runtime: `node tests/database/security-rls-postgres.mjs`; no image download is allowed.

`security-boundaries.test.ts` calls real authorization/owned-parent functions against a database
double for Setup/Details, Guests, relationships, External Vendors, Budget/payments and media.
Existing Task authorization, Assistant API and all ten-tool privacy suites remain part of the
regression run. Guest zero-row/error and safe signup error tests cover the application fixes.
`role-boundary-migration.test.ts` supplies fast source-contract checks in addition to real SQL.

`e2e/security-boundaries.spec.ts` exercises anonymous private-route redirects and forged Assistant
requests against a separate local production server with dummy loopback Supabase configuration.
It submits no signup/login or authenticated product mutation. Full Supabase JWT, PostgREST and
Storage HTTP integration remain separate from these isolated checks.

Validation results: 611 distinct Vitest tests across 29 files passed across the regression run
and focused reruns (two initially invalid payment fixtures were corrected). PostgreSQL 17.11
passed 179 assertions, including a failed-transaction rollback; the disposable DB was removed.
All 12 anonymous production-browser checks passed after splitting an overlong combined test into
per-route cases. TypeScript, whole-repository ESLint, production Webpack build and diff whitespace
checks passed. Those implementation tests used no Frankfurt connection or live QA records.

Approved Frankfurt closeout (2026-09-07): only `202609070002_role_boundary_hardening.sql`
was applied, as a complete verified SQL Editor transaction after catalog/role/reference preflight.
Postflight confirmed all five restrictive policies, revised owner-read policy, five function
definitions, two valid RESTRICT FKs, and enabled private-table RLS. Unaffected policies, including
Storage, retained their aggregate fingerprint. Whole-row fingerprints and counts were unchanged:
weddings 1, profiles 2, vendor_profiles 497, couple_vendors 5, reviews 2727, tasks 4, guests 0,
budget_items 2, payments 1. No invalid references or wrong-role parents were found.

The existing authenticated Couple session rendered `/wedding`, `/tasks`, `/guests`, `/budget`,
`/vendors/my` and `/assistant` normally; no record or Assistant-message submission was made.
An isolated anonymous browser loaded Marketplace and a public vendor profile with reviews and
all displayed images loaded (13/13 and 2/2). The six private Couple routes and both Vendor routes
redirected to the appropriate sign-in page. The final Vendor-profile check initially timed out
waiting for network idle; a focused DOM-ready retry passed with no browser exception.
No authenticated Vendor session was available, so Vendor-page smoke remains unrun; the approved
isolated role tests provide mutation coverage. No actual live security/runtime failure was found.
Private Couple-media HTTP rendering was not exercised; public vendor imagery rendered normally.

Final Production QA retains full Supabase JWT adversarial and Storage HTTP boundary verification.
Later Cleanup retains narrow Upcoming titles, normal Budget overdue-payment wording, and
non-security feedback handling in older bookmark/review/media actions. No seeds, live QA records,
other migrations, migration-history changes, pushes or deployments occurred during closeout.

## Repository cleanup validation — 2026-09-08

Cleanup preserved runtime source, scripts, migrations, seed/JSON, packages, active tests/fixtures and
all public runtime assets byte-for-byte. Only documentation/ignore rules, approved historical-file
removals and stale RLS policy expectations changed. Reference originals remain ignored locally.

- TypeScript, whole-repository ESLint, seed consistency and production webpack build passed.
- All 762 Vitest cases across 53 files passed across the full run and focused image-suite rerun.
  The first image-inventory run exceeded its five-second limit under concurrent load; a 30-second
  command-line budget passed without editing assertions. Initial sandbox startup was retried with
  local subprocess permission.
- All 107 maintained Playwright cases passed: normal app 62, Assistant 15, Budget 7, Setup 10,
  Tasks 5 and countdown 8. One Task case and two countdown widths initially exceeded the 30-second
  whole-test timeout during the build; unchanged cases passed with a 90-second runner timeout.
  Normal-app tests used a credential-free production build; fixture suites used isolated hosts.
  All 291 Marketplace assets decoded, and all 64 dedicated newer-vendor card/profile mappings passed.
- Both maintained PostgreSQL runners passed against disposable PostgreSQL 17.11. Security executed
  179 assertions. The Task runner passed its enum/order/preservation/CRUD/rollback checks on retry
  after a transient container-startup race. Containers and volumes were removed.
- All 45 assertions in the repaired RLS SQL test matched the actual isolated PostgreSQL catalog.
  Native pgTAP was unavailable in the plain postgres:17 image: this was direct assertion-content
  verification, not native pgTAP execution. Both pgTAP SQL files remain maintained for an isolated
  Supabase-compatible test environment with that extension.
- No active reference to removed files, missing fixture, credential-pattern finding or changed
  protected runtime file was found. Whitespace checking passed. No Frankfurt connection/mutation,
  live QA records, push or deployment was part of cleanup.

Remaining final QA: native pgTAP runner integration, full Supabase JWT adversarial checks and Storage
HTTP boundaries. Later cleanup retains narrow Upcoming titles, normal Budget overdue-payment wording
and older non-security bookmark/review/media feedback. The isolated Task runner's transient startup
readiness race is documented for future test-runner maintenance; no runner redesign was made here.

## Real AI Phase 1A/1B admission tests

Run `pnpm exec vitest run tests/assistant tests/ui/assistant.test.tsx tests/ui/assistant-transport.test.tsx`.
This retains Local/provider/context/history/privacy/tool regressions and adds deterministic digests,
request UUID validation, safe errors, dormant lifecycle sequencing, Local channel bypass, RPC argument
minimization and server-module boundaries. Browser-like composer tests verify manual retry identity,
new-turn IDs, no double dispatch, pending-input preservation and no automatic retry of ambiguous failures.
No real provider is used. These tests do not claim live Supabase JWT/PostgREST verification.

Run `node tests/database/assistant-admission-postgres.mjs` with Docker and an existing `postgres:17`
image. It uses `--pull=never --network none`, publishes no ports, loads the exact migrations into a
disposable database and removes its container/volume in finally. It reads no secrets, runs no seed,
and never contacts Frankfurt. Readiness checks container-local TCP to avoid Docker's temporary init server.

Coverage includes 1–500/501, two eight-connection final-slot races, 150/151 per Couple without waits
or timestamp changes, successive completed turns without throttling, active/dispatch races, idempotency/conflicts, deletion/restart durability, rollback and
isolation. Terminal uncertain retains global/per-Couple units, cannot redispatch/complete again, releases
the active slot and permits a new counted UUID. Known pre-dispatch failures remain counted. Actual
non-owner sessions test browser function denial, service-role RPC execution, direct ledger denial even
for service_role, role escalation denial and hardened function definitions. No fixture timestamp manipulation,
system clock changes or live application data changes are required.
