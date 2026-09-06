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
