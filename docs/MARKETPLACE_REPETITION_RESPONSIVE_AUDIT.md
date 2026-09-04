# Marketplace repetition and responsive audit — 4 September 2026

Follow-up: the owner clarified the controlled image scope. The completed targeted pass is recorded in
`TARGETED_MARKETPLACE_IMAGE_AUDIT.md`. The pending decision below is retained as the earlier audit history;
it is superseded by that report. The responsive findings below remain applicable.

## Outcome and outstanding decision

The responsive review and the two Vendor Auth comments are complete. **Marketplace replacement work is not complete:** the audit found a conflict between replacing every repeated occurrence and allowing only slight pool growth. No marketplace files or mappings were changed while that decision is pending.

A small selective batch can reduce the most noticeable repetitions but cannot eliminate all 224 redundant within-subcategory primary assignments. Making every cover unique within every subcategory could require up to 224 additional images before any suitable cross-category reuse. That would be a material expansion, not a slight increase. Existing assets must not be overwritten merely because their composition resembles another approved asset.

## A. Image audit

Reviewed all 432 listing-order covers in contact sheets made from the final runtime mappings, not old generation sources. Decoded all 198 WebPs and checked SHA-256 hashes. A repeated occurrence means a primary image appearing after its first use **within the same subcategory**, not every possible duplicate pair.

| Subcategory | Vendors | Unique primary images | Repeated occurrences |
|---|---:|---:|---:|
| Wedding Venues & Gardens | 36 | 36 | 0 |
| Wedding Photographers | 22 | 22 | 0 |
| Videographers | 22 | 22 | 0 |
| Magnet Photographers | 22 | 22 | 0 |
| Social Content | 22 | 6 | 16 |
| DJs | 22 | 7 | 15 |
| Attractions | 22 | 7 | 15 |
| Photo Booths | 22 | 6 | 16 |
| Wedding Dresses | 22 | 10 | 12 |
| Suits | 22 | 9 | 13 |
| Makeup & Hair | 22 | 9 | 13 |
| Event & Chuppah Design | 22 | 8 | 14 |
| Flowers | 22 | 8 | 14 |
| Invitations | 22 | 7 | 15 |
| Guest Gifts | 22 | 7 | 15 |
| Transportation | 22 | 5 | 17 |
| Rabbis & Officiants | 22 | 5 | 17 |
| Event Managers | 22 | 6 | 16 |
| Hotels & Preparation Locations | 22 | 6 | 16 |
| **Total** | **432** | **208 across categories** | **224** |

There are **zero byte-identical physical files**. The exact repetition is mapping reuse. All 198 runtime files are used. The first four categories have sufficient cover diversity and should remain unchanged. The other 15 contain visibly recurring cycles; hotels include adjacent uses of the same room image.

### Composition-similarity flags

Manual review also flagged **10 similarity groups / 13 secondary compositions**, excluding repeated uses of the same file. These are subjective review candidates, not proof of identical sources or a decision to replace approved work:

- Social Content 01 / 05: over-shoulder phone capture of bridal accessories.
- DJs 01 / 07: rear-booth view toward a warm outdoor dance floor.
- Wedding Dresses 03 / 04 / 08: similar ivory atelier/seamstress setting.
- Wedding Dresses 06 / 07: full-length bridal pose beside an atelier window.
- Makeup & Hair 01 / 07: brunette bride receiving makeup from the left.
- Makeup & Hair 02 / 08: rear view of an embellished bridal updo.
- Event Design 01 / 02 / 04: frontal white-draped floral chuppah composition.
- Flowers 02 / 04: florist assembling an ivory bouquet at a workbench.
- Invitations 01 / 02 / 03: ivory stationery, ribbon and wax-seal flat-lays.
- Preparation Hotels 01 / 06: bridal room organized around bed, hanging dress and open doors.

Numbers refer to the filename suffix in each category folder. Some flags include MUST_USE assets, notably Flowers 02 and Invitations 01/02: retain those assets. Different venues and the unique photography/video/magnet covers share some wedding motifs, but their settings, activities and framing provide meaningful variety; no replacement is recommended merely for sharing a motif.

### Pool accounting

- Before and after: **198 runtime marketplace images; 25,859,086 bytes (24.66 MiB)**.
- Average WebP: **130,601 bytes (127.54 KiB)**.
- Marketplace assignments replaced: **0, pending scope confirmation**.
- Newly generated images: **0**. Existing asset files overwritten/deleted: **0**.
- Vendor Auth uses an existing planner asset; this adds no file to the pool.
- No unnecessary unused images were generated. No external runtime image dependency was added.
- Evidence: `.codex-tmp/repetition-review/summary.json` and 19 `<subcategory>.webp` contact sheets in the same directory. These are ignored local audit artifacts.

## B. Responsive/browser review

### Exact changes this pass

1. `src/components/auth/auth-page.tsx`: Vendor heading is now **Your Work. Their Perfect Day.** Vendor signup/login use `/demo-marketplace/event-managers/event-managers-01.webp`, with alt text **Wedding planner reviewing reception preparations**. Couple imagery/copy and all form behavior remain unchanged.
2. `src/app/product.css`: below/equal to 900px, Vendor Auth's previously hidden image becomes a 16:9 editorial banner above the form. Desktop composition is unchanged. Existing Couple-specific crops remain unchanged. No other layout change was necessary.
3. `e2e/responsive-auth.spec.ts`: planner-image/headline assertions, responsive image/form ordering, representative screenshots and intermediate resize coverage.
4. This audit report.

### Pages and viewports

Browser-tested homepage `/`; Couple signup/login `/auth/couple` and `?mode=login`; Vendor signup/login `/auth/vendor` and `?mode=login`; directory/marketplace `/vendors`; venue-filtered listing `/vendors?category=venues`; photography category navigation and search/pagination; public vendor profile reached from the first listing card (Alma). Additional existing tests cover representative venue, photographer and magnet profiles, callback failure and branded 404.

Full responsive matrix: **1440×1000, 1280×900, 768×1024, 390×844, 375×812, 360×800**. Mobile contexts use Playwright iPhone 13 emulation with the requested viewport overrides (Chromium; not a claim of physical Safari testing).

Live resize checks at height 900: **500, 639, 640, 641, 699, 700, 701, 767, 769, 899, 900, 901, 1023, 1024, 1025, 1150px**. These cover the same eight main route variants, with photography filtering in the resize matrix. Existing regression coverage also checks 320px.

No unintended document-width overflow or offscreen controls were detected. Images decoded, retained `object-fit: cover`, and controls remained reachable. Auth fields meet 44px height and 16px text checks. The selected planner remains visible without clipping her face at desktop and mobile crops. No new overlapping sections were observed in representative screenshots.

Existing responsive behavior retained:

- Public navigation becomes a compact expandable menu; real links and no-JavaScript menu behavior pass.
- Auth changes from two columns to one at 900px, with image/banner before the form. Partner input pairs stack on phones.
- Category navigation changes from six columns to three and then two, retaining large icon targets.
- Marketplace filters and cards stack; search, category selection and pagination work.
- Vendor profile content, contact actions and reviews stack naturally.

### Representative screenshots

All paths are relative to the repository; files are ignored local artifacts:

- `.codex-tmp/repetition-review/vendor-signup-1440.png`
- `.codex-tmp/repetition-review/vendor-signup-390.png`
- `.codex-tmp/repetition-review/vendor-login-390.png`
- `.codex-tmp/repetition-review/profile-390.png`
- `.codex-tmp/approved-auth-couple-signup-1440.png`
- `.codex-tmp/approved-auth-couple-signup-390.png`
- `.codex-tmp/approved-auth-homepage-390.png`
- `.codex-tmp/approved-auth-marketplace-390.png`
- `.codex-tmp/repetition-review/marketplace-entry-390.png`
- `.codex-tmp/repetition-review/marketplace-cards-390.png`

The last two are technical crops of the full marketplace screenshot for readable inspection, not altered runtime assets. Visually inspected the new Vendor Auth desktop/mobile, mobile Couple signup, homepage, marketplace entry/cards, vendor profile and Vendor login screenshots.

### Protected pages — connected review still required

Source/layout reviewed: Couple Dashboard, Wedding Details, Setup, Tasks, Timeline, Budget/Payments, My Vendors, Assistant, Vendor Dashboard, business profile/gallery, both Settings pages, and the existing Wedding Week banner. Their real guards remain active; 13 protected-route redirect assertions pass. No fake sessions or fixture-auth routes were created.

Existing source already uses stacking grids, shrinking/wrapping controls and safe-area clearance. Budget payments are wrapping rows, not a fixed-width financial table. Assistant messages wrap; the composer is in normal flow, with a shrinking textarea rather than fixed keyboard-obscuring placement. My Vendors status tabs have controlled local scrolling. No additional private-page CSS was changed speculatively. **All these protected pages still need real authenticated mobile browser verification after connection**, including populated/long-data states and mobile keyboard behavior.

## Validation and safety

- Image existence/decode: all 198 files pass Sharp decoding and browser pool tests.
- Mapping/data validation: existing dataset tests pass, including local pool references and priority-category unique covers. JSON, SQL and mapping source are byte-for-byte unchanged from this pass's baseline. No seed-generation or seed-application command was run.
- TypeScript: pass (`tsc --noEmit`).
- ESLint: pass.
- Vitest: **35/35 tests, 11 files pass**. Initial sandbox configuration-loader denial resolved by authorized local rerun outside sandbox.
- Playwright: **28/28 pass**; separate latest breakpoint rerun **1/1 pass**. No failing UI assertions hidden or relaxed.
- Production build: **`next build --webpack` passes**, including page generation. Default Turbopack build failed twice with a local CSS child-process `EPERM`/directory-resolution error, including an escalated retry. No source/config change was made to conceal it. Browser tests ran against the successful production build on a temporary local port 3101 server, subsequently stopped; the user's port 3000 server was not stopped.
- Git: branch `main`; before adding this report, **46 modified, 434 deleted, 216 untracked files**, nothing staged. This report adds one untracked file. These totals include extensive pre-existing work; this pass did not create any of the deletions. Baseline hashes identify only the three code/test files listed above as changed during this pass.
- All 432 vendors and the current **2,383 reviews** preserved; vendor data, IDs, slugs and image mappings unchanged. The older 2,380 count is not the current baseline.
- No database/schema/business logic/Auth/roles/RLS/routes/API changes; no Supabase connection, migrations, seed execution, Auth-user creation, remote Storage mutation, commit, push, Vercel deployment, paid service, or unrelated redesign/refactor. `.env.local` and `AGENTS.md` unchanged. Approved/MUST_USE assets untouched.
