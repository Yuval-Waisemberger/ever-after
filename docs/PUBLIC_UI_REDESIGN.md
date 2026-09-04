# Controlled public UI redesign

## Scope and fidelity

The homepage now follows the approved mockup's composition: a 76px desktop header, approximately 619px full-width hero at 1536px viewport width, centered editorial heading and copy, paired cream/outlined CTAs, a vendor entry, scroll indicator, and a warm-ivory four-column feature section with thin dividers. The palette, spacing, restrained icons and button treatment carry through to the public directory.

This is a close layout translation, not a pixel-identical reproduction. The hero uses an existing approved local wedding photograph instead of the mockup's video/frame. Existing system serif/sans-serif fonts have slightly different letterforms. The second attachment is logo artwork rather than a directory mockup; its original file is preserved and framed/tonally adjusted with CSS in the header. Directory composition follows the user's written direction.

## Exact implementation files

Updated:

- `src/app/page.tsx` — cinematic homepage and four product pillars; existing authenticated redirects retained.
- `src/app/layout.tsx` — imports the scoped public stylesheet.
- `src/app/vendors/page.tsx` — editorial directory introduction, category entry and results anchor; existing queries, cards, filters and pagination retained.
- `src/app/vendors/[slug]/page.tsx` — adds the skip-link target to the existing main element only in this phase.
- `src/components/layout/public-header.tsx` — shared restrained public navigation and supplied logo.
- `e2e/public.spec.ts` — updates existing homepage/directory expectations; earlier marketplace tests preserved.
- `playwright.config.ts` — uses `localhost`, matching the browser's working development address; the numeric loopback address failed the development WebSocket handshake in this environment.

Added:

- `src/app/public.css` — public-scoped palette, layout, typography, responsive styles and focus treatment.
- `src/components/layout/public-mobile-menu.tsx` — native disclosure navigation, enhanced with Escape and close-on-selection.
- `src/components/vendors/category-navigation.tsx` — six icon links using existing category query parameters.
- `public/brand/ever-after-approved.png` — unchanged copy of the supplied logo artwork, served through Next Image.
- `e2e/public-redesign.spec.ts` — five public entry, layout, category and mobile browser tests.
- `tests/ui/public-navigation.test.tsx` — two navigation/taxonomy tests.
- `docs/PUBLIC_UI_REDESIGN.md` — this report.

`globals.css` has no retained content change. Temporary capture/diagnostic scripts and four screenshots are under ignored `.codex-tmp/`; normal build/test output remains ignored. No marketplace images were replaced or generated in this phase.

## Navigation and real entry paths

- **How it works:** `/#how-it-works`, the four actual product pillars.
- **Vendors / Explore vendors:** `/vendors`, public browsing without an account.
- **Log in:** `/auth/couple?mode=login`, the existing login entry.
- **Sign up / Plan our wedding:** `/auth/couple`, the existing Couple registration entry.
- **Are you a vendor? Join Ever After:** `/auth/vendor`, the existing Vendor registration entry.
- Signed-in header behavior retains the appropriate `/wedding` or `/vendor` workspace link.

No Pricing, Inspiration, About, guest account flow or other fictional destination was added. Auth forms were visited but never submitted.

## Hero, features and responsive behavior

The hero is a responsive Next Image using `/demo-marketplace/wedding-photographers/wedding-photographers-06.webp`, with a warm readability overlay. The media lives in a dedicated layer so a later approved video can replace it without restructuring the page. There is no fake pause control. The background is decorative; branding has meaningful alternative text.

Four pillars:

1. **Plan with ease:** Tasks, timeline and wedding details in one place.
2. **Find the perfect vendors:** Vendors fitting style, location and budget.
3. **Stay on track:** Budget, payments and important deadlines.
4. **AI Wedding Assistant:** Personalized guidance based on wedding context.

Desktop has horizontal navigation, side-by-side CTAs and four feature columns. Mobile uses a 44px native menu control, portrait hero crop, stacked CTAs, shorter line lengths and vertically stacked features separated by fine rules. Category navigation uses six desktop columns, three tablet columns and two mobile columns. Focus states, skip navigation, semantic links and reduced-motion support are retained. The native mobile disclosure and links work without JavaScript; Escape is a client-side enhancement.

## Directory and category mapping

Heading: **Find the people behind your perfect day.** A short introduction leads to **Browse by Category**, then the existing marketplace results and controls.

| Label | Existing category parameter |
| --- | --- |
| Wedding Venues & Gardens | `venues` |
| Photography & Content | `photography-content` |
| Music & Entertainment | `music-entertainment` |
| Beauty & Attire | `beauty-attire` |
| Design & Flowers | `design-flowers` |
| Event Services | `event-services` |

Each link uses `/vendors?category=<value>#marketplace-results`, identifies the active category, and starts a fresh category selection. No duplicate page or route was introduced. Existing filter parsing, searches, pagination, vendor profile routes and disconnected fallback data are unchanged. The existing filter form is keyed by its parsed URL filters so its uncontrolled fields refresh after category navigation; no filtering/business logic changed. Mobile menu entries use native links to avoid closing the disclosure interrupting client navigation.

## Validation

- TypeScript (`pnpm typecheck`): passed.
- ESLint (`pnpm lint`): passed.
- Vitest (`pnpm test`): 32 tests across 10 files passed, including two new navigation tests.
- Production build (`pnpm build`): passed, with existing route structure retained.
- Playwright: all 16 cases have passing results across the local production run and targeted rerun. The full production run passed 13/16; two mobile page-load waits and one image-decoding wait timed out. After making the mobile tests wait for DOM readiness and actual UI/image conditions, the three targeted cases passed (44.8 seconds). The isolated production configuration uses one worker and a 15-second assertion allowance for local image optimization. This was not a single clean 16/16 run.
- `git diff --check`: passed; Git reports existing Windows line-ending normalization warnings.
- Desktop and iPhone screenshots reviewed for both homepage and directory. Browser tests check entry destinations, six category filters, search/pagination, images, 320/390/430/768/1536px overflow, keyboard interaction and no-JavaScript mobile navigation.

Visual captures: `.codex-tmp/homepage-desktop.png`, `.codex-tmp/homepage-iphone.png`, `.codex-tmp/directory-desktop.png`, `.codex-tmp/directory-iphone.png`.

Earlier development-server runs were not consistently green: the numeric loopback address failed HMR, and hydrated client-navigation/layout checks were intermittent under development load. The final regression checks used the compiled application on `localhost:3100`, with an ignored `.codex-tmp/playwright.public.config.ts` override. That temporary server was managed and stopped by Playwright; nothing was deployed. The ordinary development server at port 3000 was left alone. Two narrowly documented ESLint exceptions allow native links inside the mobile disclosure; no backend or test assertion was removed to obtain passing results.

## Data safety and Git

The marketplace JSON, `supabase/seed.sql`, `.env.local` and `AGENTS.md` have identical SHA-256 hashes before and after this phase. The existing 432 vendors, 2,383 reviews and 198 runtime marketplace WebPs are unchanged. IDs, slugs, prices, ratings, recommendation behavior, Auth, schema, RLS and private dashboards were not changed by this redesign.

Branch: `main`. No staged files. Before this phase the worktree already contained 20 modified, 434 deleted and 200 untracked files. Including this report, the final worktree contains 25 modified, 434 deleted and 207 untracked files (individual-file counting). All 434 deletions predate this phase; this redesign deletes no project files. Earlier marketplace work remains untouched, so the full Git diff is not limited to this redesign.

No Supabase connection, migration, seed operation, Auth-user creation, Storage modification, commit, push, deployment or paid service occurred. No dependency or animation library was added. Backend tests that require a connected database were not run.
