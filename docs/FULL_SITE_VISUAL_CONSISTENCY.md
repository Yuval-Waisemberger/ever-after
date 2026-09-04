# Ever After — full-site visual consistency

Date: 4 September 2026. Scope: presentation only, measured against the working tree at the start of this phase.

## Outcome

The approved homepage and directory remain the visual foundation. Their page source, public stylesheet, public header and category-navigation source were not edited in this phase. Shared controls and marketplace cards now use the same warm ivory, champagne, taupe and muted-gold language.

Existing public and private screens inherit one restrained system: editorial serif headings, readable sans-serif controls, thin borders, reduced corner radii, light surfaces, minimal shadows and accessible focus/feedback styling. No new UI framework, animation library, image pool or dependency was added.

## Page coverage and verification

| Area | Visual work | Verification |
| --- | --- | --- |
| Homepage and directory | Preserved approved composition; shared token integration only | Desktop/mobile browser review and regression tests |
| Marketplace/listing | Refined cards, filters/controls, subtle recommendation badges, pagination styling | Desktop/mobile, search/category/pagination, decoded images |
| Public vendor profile and reviews | Editorial image/intro, services/contact sections, readable pricing/reviews | Desktop/mobile browser review |
| Couple and Vendor registration/login | Approved branding, ivory editorial split layout, refined long forms and feedback | All four views tested; desktop/mobile reviewed |
| Callback failure and 404 | Matching brand and readable feedback; existing HTTP/redirect behavior retained | Browser and automated checks |
| Couple shell and Dashboard | Compact sidebar/mobile navigation, varied summary hierarchy, lighter supporting cards, Wedding Week banner | Source/component review; connected visual review pending |
| Wedding Setup and Wedding Details | Calm progress/choices, consistent fields, grouped forms and actions | Source/shared-component review; connected visual review pending |
| Tasks and Wedding Timeline | Status treatment, readable rows, chronology and mobile wrapping | Source review; connected visual review pending |
| Budget and Payments | Financial summary strip, tabular values, restrained expenses/forms, mobile label/value layout | Source/domain tests; connected visual review pending |
| My Vendors and relationship/review forms | Subtle status tabs/pills and shared forms/buttons | Source review; authenticated interaction/visual review pending |
| Wedding Assistant | Warm conversational surface, restrained prompts, responsive composer | Source/provider tests; connected visual review pending |
| Vendor Dashboard/profile/gallery/services | Shared shell, page headings, forms, uploads, summaries and feedback | Source review; connected visual review pending |
| Couple and Vendor settings | Shared restrained headings, fields and containers | Source review; connected visual review pending |

No existing product page intentionally retains the old visual identity. Marketing remains cinematic while workspaces remain denser and functional, using the same brand. Native date/select/file controls retain platform behavior. No new modal, tab behavior or future feature was invented solely for appearance.

## Shared implementation

- Existing CSS variables were aligned with the approved palette, retaining semantic token names to avoid unrelated refactoring. Success uses warm neutrals and errors use restrained rose.
- Added `src/app/product.css` for the existing product components; imported before the approved public stylesheet.
- Reused and updated Wordmark, PageHeader, FormField, ChoiceGrid, LinkButton, SubmitButton, EmptyState, DashboardCard and AppShell.
- Preserved native input semantics, required/disabled attributes, labels, pending states, action bindings, checkbox/radio values and existing validation behavior.
- Desktop shell remains sidebar-based; mobile has a native disclosure menu with the same existing navigation/subnavigation and sign-out action. Existing quick navigation remains available.
- Auth uses an existing local wedding image on desktop, hidden on narrow screens so long forms remain practical.
- Added branded not-found presentation without changing the 404 status or creating a route.
- Existing setup questions/skip logic, dashboard queries, financial formulas, review criteria and Assistant behavior were not changed.

## Mobile review

Reviewed real accessible pages at desktop 1440/1536 px and mobile 390 px. Automated overflow checks also covered 320 and 768 px. Auth, directory/listing and vendor profile had no horizontal overflow. Auth fields were verified at least 44 px high with at least 16 px text. Mobile forms stack cleanly; marketplace images retain their crops; navigation and CTAs remain usable.

Screenshots are local ignored QA artifacts under `.codex-tmp/full-site-*.png`, including homepage, directory, profile, all Auth views, mobile views, callback feedback and 404. These are Chromium viewport checks, not physical iPhone/Safari certification.

Private pages were not rendered using fake users or bypassed guards. Their mobile CSS has been reviewed from source, but real populated/empty/error states require connected verification.

## Validation

- TypeScript: passed (`tsc --noEmit`).
- ESLint: full pass; the final changed E2E test also passed a targeted lint run.
- Vitest: 35 tests passed across 11 files, including 3 new shared-primitive tests.
- Playwright: 21 tests passed (30.8 seconds) against the local production server, using one Chromium worker.
- Production build: passed after final application/CSS changes.
- Git whitespace check: passed; Git emitted only existing line-ending normalization warnings.
- Regression coverage includes public entry links, six category filters, search/pagination, image decoding, dataset corrections, four Auth views, native form constraints, callback failure, 404, mobile overflow and all 13 protected-route redirects.

Earlier E2E assertions used old Auth wording and an overly exact password label. These were updated to the rendered accessible UI. The protected-route test now asserts the existing sign-in notice and sign-in action, rather than incorrectly requiring login mode. Auth redirect/mode behavior was not changed to satisfy tests.

The first final-run harness stalled during server/process teardown. Re-running the full suite against the already-running local production server, without web-server lifecycle management, completed successfully with exit code 0. This required no application or tracked configuration change.

## Connected review still required

Couple Dashboard/Wedding Week, Setup, Wedding Details, Tasks/Timeline, Budget/Payments, My Vendors, Assistant, Couple settings, Vendor Dashboard, business profile/gallery/services and Vendor settings need connected desktop/mobile visual review. Actual account creation/login, email confirmation, authenticated validation/success states, review submission and uploads also remain unverified while disconnected. Vendor Explore retains its existing protected redirect to the public marketplace.

## Separate existing issue observed

ILS price-range text can visually reorder around the right-to-left currency symbol in the Latin interface. Values and the existing formatter were left unchanged; this needs a separate targeted follow-up, not a silent business/formatting change in this visual pass.

## Exact files changed in this phase

Paths below are relative to the repository root. This is the phase-specific list, not the complete pre-existing dirty working tree.

- `e2e/public.spec.ts`
- `e2e/visual-consistency.spec.ts`
- `src/app/(couple)/budget/page.tsx`
- `src/app/(couple)/vendors/my/page.tsx`
- `src/app/(couple)/wedding/page.tsx`
- `src/app/(couple)/wedding/timeline/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/not-found.tsx`
- `src/app/product.css`
- `src/app/vendors/[slug]/page.tsx`
- `src/components/assistant/assistant-chat.tsx`
- `src/components/auth/auth-page.tsx`
- `src/components/auth/auth-panel.tsx`
- `src/components/brand/wordmark.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/page-header.tsx`
- `src/components/tasks/task-row.tsx`
- `src/components/ui/choice-grid.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/form-field.tsx`
- `src/components/ui/link-button.tsx`
- `src/components/ui/submit-button.tsx`
- `src/components/vendors/review-form.tsx`
- `src/components/vendors/vendor-card.tsx`
- `src/components/vendors/vendor-status-actions.tsx`
- `src/components/wedding/dashboard-card.tsx`
- `src/components/wedding/setup-wizard.tsx`
- `tests/ui/product-primitives.test.tsx`
- `docs/FULL_SITE_VISUAL_CONSISTENCY.md` (this report)

30 source/test/documentation files total; ignored screenshots/capture utilities and build/test outputs are not product files.

## Git status and safety

Branch: `main`. At phase start: 25 modified, 434 deleted and 207 untracked files. Final status including this report: 46 modified, 434 deleted and 212 untracked files (individual-file counts); no staged files. All 434 deletions predated this phase. No pre-existing work was reverted or cleaned up.

Hash comparisons against this phase's baseline confirm no changes to `src/lib/**`, Auth actions/guards, API/callback behavior, Supabase files, migrations, seed, dataset, package/lock/config files, `.env.local` or `AGENTS.md`. Existing 432 vendors, 2,383 reviews and 198 runtime WebPs were preserved as found.

No functionality, business logic, schema, Auth or RLS was intentionally changed. No Supabase connection, migration, seed execution, account creation, Storage operation, staging, commit, push, deployment or paid service occurred. No secrets were exposed. No unrelated cleanup followed the requested pass.
