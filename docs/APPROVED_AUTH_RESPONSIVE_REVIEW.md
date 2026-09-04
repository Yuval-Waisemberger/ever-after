# Approved Couple asset and responsive review

Date: 4 September 2026. This report covers only the approved-asset/copy/responsive phase, not earlier uncommitted work.

## Exact approved image

- Original supplied file: `C:/Users/yuval/Downloads/ChatGPT Image Sep 4, 2026, 01_43_18 PM.png`. Left untouched.
- Byte-identical archive in the project: `assets/approved/couple-auth-petals.original.png` (2,159,935 bytes). SHA-256 comparison with the supplied original passed.
- Runtime copy: `public/images/auth/couple-petals.webp` (186,682 bytes, about 182 KiB; 1122 × 1402). Encoded locally at WebP quality 90 without resizing or changing the image content.
- This exact supplied image is used on Couple signup and Couple login. No image generation, substitution, retouching, color adjustment, overlay or saturation filter was applied. The original remains available for future technical exports.

### Responsive image treatment

Desktop above 900 px: the image occupies the editorial column beside the form, using a 4:5 portrait frame, `object-fit: cover`, centered positioning and no rounded-card treatment. Its frame closely matches the original ratio, preserving essentially the full composition, faces, bouquet and falling petals without stretching.

Tablet at/below 900 px: the layout becomes one column. The image remains visible above the form as a 16:9 banner with `object-position: 50% 31%` to keep faces and petals in view.

Mobile at/below 640 px: the banner becomes 4:3, preserving more vertical context. The form uses the available width below it; partner fields stack. The image is not hidden on mobile. Next Image provides responsive browser-sized copies of the same local asset.

## Exact copy changes

| Previous | New |
| --- | --- |
| Everything before your ever after (Couple Auth eyebrow) | EVERYTHING BEFORE YOUR HAPPILY EVER AFTER |
| Setup is optional, every detail stays editable, and your workspace grows with your plans. | A space for the two of you, bringing every part of your wedding together, beautifully. |
| Registration comes first. Your optional wedding setup follows in a few short steps. | Start planning together. Make it yours now, or settle into the details later. |
| Partner 1 name | First Partner name |
| Partner 2 name | Second Partner name |
| Partner 1 phone (optional) | First Partner phone (optional) |
| Partner 2 phone (optional) | Second Partner phone (optional) |

The eyebrow is rendered uppercase by the existing visual system. Existing field names (`partnerOneName`, `partnerTwoName`, `partnerOnePhone`, `partnerTwoPhone`), validation references, required/optional behavior, form actions, roles and mode switching were preserved. Other unchanged copy includes the existing page titles and login text.

## Shared Auth alignment

Couple signup/login and Vendor signup/login retain the same approved ivory/taupe palette, editorial headings, branding, refined form surfaces, buttons, labels and feedback classes. Vendor content remains Vendor-specific and its existing decorative image treatment remains separate from the mandatory Couple asset. Existing error/success and email-confirmation messages still use the shared feedback presentation; no future confirmation flow was invented.

## Responsive audit

| Area | Review and result |
| --- | --- |
| Homepage | Browser-tested: portrait hero crop, stacked mobile CTAs, readable copy and compact menu. Approved source/design unchanged. |
| Directory | Browser-tested: six tappable categories; six columns on large desktop, three at tablet, two on mobile. Category links use existing filters. |
| Marketplace | Browser-tested: responsive cards, image crops, filters, search and pagination. Mobile filter inputs/selects now use 16 px text and fluid widths. |
| Vendor profile | Browser-tested: prominent image, stacked details/contact/reviews and reachable account-entry action. Existing public profile has a main image, not a newly invented gallery. |
| All four Auth views | Browser-tested at every required size. Single-column mobile form, touch-sized controls and visible approved Couple image. |
| Couple Dashboard/Wedding Week | Source reviewed: responsive summary grid, narrow-screen task summaries, wrapping long values and safe bottom-navigation clearance. Real connected verification pending. |
| Wedding Setup/Details | Source reviewed: responsive field grids, existing step/action wrapping, minimum-width containment for fieldsets and forms. Real connected verification pending. |
| Tasks/Timeline | Source reviewed: stacked row controls, wrapping task text and mobile date placement. Real connected verification pending. |
| Budget/Payments | Source reviewed: existing wrapping expense/payment rows instead of fixed-width tables; narrow-screen summary values can wrap. Real connected verification pending. |
| Assistant | Source reviewed: stacked prompts/conversation, shrinkable composer and wrapping messages. Composer remains in normal flow; no new fixed overlay. Real connected verification pending. |
| My Vendors, Vendor workspace/gallery, both settings areas | Source reviewed through existing responsive grids, shared forms and shell. Real connected verification pending. |

### Responsive changes in this phase

- Mandatory Couple image now stays visible on tablet/mobile; the desktop side-by-side layout becomes a genuine single-column flow.
- Partner fields explicitly stack on narrow screens while remaining paired when enough width exists.
- Mobile marketplace input/select text is 16 px to avoid tiny controls and iPhone focus zoom.
- Workspace forms, fieldsets, sections and articles can shrink inside grids; long inline content wraps rather than forcing the page wider.
- Status-tab items retain their readable widths inside the existing horizontal scroller.
- Dashboard task summaries stack on narrow screens; budget summary label/value rows may wrap.
- Workspace content clearance includes the bottom safe-area inset; its mobile header accounts for the top inset when supplied by the browser.
- Auth's Explore Vendors link has a touch-friendly minimum height.

No unintended horizontal page overflow was found in the final accessible-page matrix. The workspace additions are preventive source-level hardening, not a claim that protected pages were browser-tested. Existing deliberate title/description truncation on vendor cards remains unchanged. No dialogs or device-specific duplicate pages were introduced.

### Navigation and form behavior

Public navigation keeps the existing desktop links and compact mobile disclosure menu. Tests opened that menu and navigated to Vendors on touch-emulated screens. Workspace navigation retains its sidebar, mobile full-navigation disclosure and bottom quick links; no destinations or guards changed.

Auth forms reorganize to one column on phones with almost full-width controls. Fields were checked for a minimum 44 px height and 16 px input text; first/second partner fields were checked for vertical stacking. Search, category selection and pagination were actually exercised at every required viewport. No registration or sign-in submission was performed.

## Exact viewport matrix

Each matrix case visited homepage, Couple signup, Couple login, Vendor signup, Vendor login, directory/listing, venue-filtered marketplace and a vendor profile:

- Desktop: 1440 × 1000 and 1280 × 900.
- Tablet: 768 × 1024.
- Mobile: 390 × 844, 375 × 812 and 360 × 800.

Mobile matrix contexts used Playwright's iPhone 13 device settings with explicit viewport overrides, including touch/mobile emulation. These ran in Chromium, not physical iPhone hardware or Safari. The existing regression suite additionally covers 320 px and other viewports.

Checks include document width, horizontally clipped headings/controls/cards, decoded/loaded images, `object-fit`, correct approved asset URL, no image filter, image-versus-form placement, form sizing, copy/field-name mappings, category clicks, real search and pagination. Representative screenshots were visually inspected for composition and overlap.

## Representative screenshots

All paths are relative to the repository root; QA images are ignored local artifacts:

- `.codex-tmp/approved-auth-couple-signup-1440.png` — desktop Couple signup.
- `.codex-tmp/approved-auth-couple-1280.png` — smaller desktop.
- `.codex-tmp/approved-auth-couple-tablet.png` — tablet banner/form.
- `.codex-tmp/approved-auth-couple-signup-390.png` — iPhone-sized Couple signup.
- `.codex-tmp/approved-auth-homepage-390.png` — iPhone homepage.
- `.codex-tmp/approved-auth-marketplace-390.png` — full iPhone directory/listing.
- `.codex-tmp/approved-auth-marketplace-card-mobile.png` — readable marketplace viewport detail.
- `.codex-tmp/approved-auth-profile-mobile.png` — mobile vendor profile.
- `.codex-tmp/approved-auth-vendor-signup-mobile.png` and `.codex-tmp/approved-auth-vendor-login-mobile.png` — Vendor Auth.

## Validation results

- TypeScript: passed (`tsc --noEmit` and production build type checking).
- ESLint: passed, full repository; targeted changed-test lint also passed before final screenshot-option adjustment.
- Vitest: 35 tests passed in 11 files. Sandbox initially blocked esbuild reading configuration; the authorized local rerun passed without code changes.
- Playwright: 27 tests passed, 1 worker, final run approximately 1.4 minutes against the local production server. Includes all six new responsive matrix cases and the existing 13 protected-route guard checks.
- Production build: passed, including all existing routes.
- Git whitespace check: passed.
- Original-file hash verification: passed. Optimized WebP successfully decoded locally and rendered on desktop/tablet/mobile.

During preliminary tests, the mobile-menu locator incorrectly assumed a button role for the native summary; the test now uses its accessible label without changing UI behavior. A tablet marketplace image request also stalled inside the temporary local image optimizer: the raw file loaded, while its WebP-negotiated optimized request hung. Restarting only the task's temporary production server cleared the stall. The full final suite then passed; no asset, cache deletion, data or application-logic workaround was used.

## Protected-page limitations

Real connected mobile browser verification remains pending for Couple Dashboard/Wedding Week, Setup, Wedding Details, Tasks, Timeline, Budget/Payments, My Vendors and its status actions, authenticated review forms, Assistant, Couple settings, Vendor Dashboard, business profile/gallery/services/uploads and Vendor settings. Actual Auth success/error responses and email verification also require later connected testing. Public callback-error presentation and all private guards remain covered locally.

No fake authentication, fixture route or protected-route bypass was created.

## Exact phase-specific files

- `assets/approved/couple-auth-petals.original.png` — new, preserved original.
- `public/images/auth/couple-petals.webp` — new, optimized exact image.
- `src/components/auth/auth-page.tsx` — asset, copy and audience-specific CSS hook.
- `src/components/auth/auth-panel.tsx` — approved copy/labels only.
- `src/app/product.css` — responsive presentation adjustments.
- `e2e/responsive-auth.spec.ts` — new six-viewport regression matrix.
- `docs/APPROVED_AUTH_RESPONSIVE_REVIEW.md` — this report.

Temporary Playwright configuration/capture helpers and screenshots remain ignored under `.codex-tmp`; no package or dependency changes were made.

## Git and safety

Branch `main`. Final status including this report: 46 modified, 434 deleted and 216 untracked files (individual-file counts), with nothing staged. The 434 deletions and the other existing dirty work predated this phase; this phase deleted nothing.

Baseline hash comparison found source changes only in the two Auth components, product CSS and new responsive test before adding this report. Homepage, public stylesheet, directory source, routes, Auth actions/guards, all `src/lib` logic, API, Supabase files, migrations/RLS, dataset/reviews, recommendation logic, tasks/timeline logic, budget formulas, AI behavior, `.env.local` and `AGENTS.md` were preserved.

No Supabase connection/link, migration, seed, Auth-user creation, remote Storage operation, staging, commit, push, deployment or paid service occurred. No image-generation service was used. No unrelated cleanup was performed.
