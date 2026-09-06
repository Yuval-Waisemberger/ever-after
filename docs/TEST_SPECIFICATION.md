# Test Specification

> Phase 1A Agent regression coverage and validation scope: see [AI Agent Specification](AI_AGENT_SPEC.md#phase-1a-validation) and tests/assistant/.

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
| Wedding Week | inclusive final seven days and out-of-window behavior | `tests/domain/wedding-week.test.ts` |
| Vendor profile | deterministic completion percentage/next steps | `tests/domain/vendor-profile.test.ts` |
| Local Assistant | grounded task answer and missing-context/general behavior | `tests/assistant/local-provider.test.ts` |
| Marketplace seed | taxonomy/counts, deterministic IDs, ranges, review consistency, local images, idempotent SQL shape | `tests/seed/marketplace-dataset.test.ts` |

Vitest discovers only `tests/**/*.test.ts(x)` so Playwright specs are not accidentally executed by a
second runner. The current suite has 26 tests across nine files.

## Browser tests

`e2e/public.spec.ts` verifies the logged-out entry paths, seeded guest marketplace/profile flow,
pagination/filtering, successful browser decoding for all 162 unique pooled WebPs (including named
representatives from 15 requested subcategories), and the private Couple-route redirect without configuration.
Additional connected-environment Playwright
cases should cover:

1. Couple registers, confirms email if enabled, completes or skips setup, and lands on My Wedding.
2. Returning Couple bypasses the landing page.
3. Partial Wedding Details save and display as Not set where appropriate.
4. Task create/edit/status/date/delete updates both Tasks and Timeline.
5. Couple searches/filters vendors, views a public profile, and changes relationship statuses.
6. Two considered photographers are compared by the Assistant using stored facts.
7. Booking appears in My Vendors and Dashboard; explicit Budget entry and payments calculate correctly.
8. Vendor registers, edits only its profile, uploads/removes an image, and sees review summaries.
9. Guest can browse published profiles but receives no private workspace data.
10. Wedding Week treatment activates within seven days and normal navigation remains available.

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
- cascade/SET NULL deletion behavior preserves required financial history.

`supabase/tests/rls.test.sql` contains a structural pgTAP starting point for schema/RLS presence. The
identity-based policy matrix requires a running Supabase test environment and must be completed/run
after credentials and migrations are configured; it is not claimed as executed locally here.

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
- Execute the full 19-step presentation demo flow from the specification.
- Inspect browser network/server logs for accidental secrets or private over-fetching.

## Commands and current result record

| Check | Command | Result on 2026-09-03 |
|---|---|---|
| TypeScript | `pnpm typecheck` | passed |
| ESLint | `pnpm lint` | passed with zero warnings |
| Seed artifacts | `pnpm seed:check` | passed: 432 vendors, 2,380 reviews, 162 referenced WebPs |
| Unit/provider | `pnpm test` | passed, 26/26 across nine files |
| Production build | `pnpm build` | passed |
| Public Playwright | `pnpm test:e2e` | passed, 6/6; all 162 unique WebPs decoded and visible covers checked in 15 subcategories |
| Manual local browser | local marketplace, filtered results, page 2, and vendor profile | passed: preview banner; daytime/evening venue photos and profile decoded; Drone + South returned 9; videographer page 2 returned 10 |
| RLS integration | Supabase local test command | not run; project not connected/migrated |

Before submission, rerun every command in a clean checkout with configured test environment, run the
identity policy matrix, and replace pending entries with dated evidence.

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
