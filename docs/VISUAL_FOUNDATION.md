# Shared visual and motion foundation

This is the Phase 0/1 implementation map, not a replacement design specification. The final English design/motion DOCX and all supplied references in the local, ignored `project-docs/design-handoff/` were reviewed. Runtime must never import those references. Selected photographs will need separately approved, optimized assets under `public/` during later page work.

## Current architecture and ownership

| Area | Existing implementation / foundation |
| --- | --- |
| Global CSS | `src/app/globals.css` imports Tailwind 4 and `foundation.css`; root layout also imports `product.css` and `public.css`. |
| Typography | Existing system stacks: Aptos / Segoe UI / Arial for body and controls; Iowan Old Style / Palatino Linotype / Georgia for editorial headings. No downloaded font or font dependency. |
| Tokens | `globals.css` owns colors, type roles, spacing, radii, surface gradients, shadows and motion. Public variables alias these roles. |
| Buttons | `SubmitButton`, `LinkButton`, `.ea-button` variants and `.public-button`. Native form/link behavior is retained. |
| Cards | `DashboardCard`, `.paper-panel`, `.ea-surface` with optional blush, tonal, champagne and interactive modifiers. Existing dashboard tint/layout classes remain in charge of their cards. |
| Inputs | `FormField`, `ChoiceGrid`, native select/textarea/checkbox controls. Shared focus underline, focus-visible outline and icon-button treatment. |
| Status | `StatusPill`, feature-specific Task/payment wrappers. Existing status colors and labels are preserved; color is never the only signal. |
| Feedback/toasts | Existing inline `.ea-feedback` with status/alert semantics. `.ea-toast` supplies an opt-in raised surface/entrance, not a new queue, timer or optimistic success system. Caller owns genuine success/error state, placement and dismissal. |
| Loading | `PageLoading` uses warm `.ea-skeleton` bars in real Next loading boundaries. There is no simulated wait. Assistant's existing request state remains unchanged. |
| Page transition | Shared `PageTransition` in Couple, Vendor, Auth and public Marketplace templates; landing main uses the same class. No client routing interception or remount key is added. |
| Couple / Vendor shell | Existing authenticated route-group layouts and `AppShell`; same sidebar, collapse state, mobile menu and role-based links. Templates sit below these layouts. |
| Public navigation | Existing `PublicHeader`, `PublicMobileMenu`, `public-header-links`. The later public/navigation owner handles the handoff's centered logo-free header. |
| Responsive | Existing Tailwind breakpoints (640/768/1024/1280/1536px) plus public CSS 700/900/1800px and product 640/900/1280px. No breakpoint/layout redesign. |
| Existing motion | `gentle-reveal`, CSS hover/focus transitions, sidebar width transition. No animation library. |
| Reduced motion | Shared media policy disables animations/transitions and smooth scrolling. Content is visible by default; checked states and messages still update. |

Page-specific hardcoded colors, spacing and feedback markup still exist in `product.css`, `public.css` and feature components. They are not a reason to refactor business code now. Later owners should consume the shared roles; the foundation owner must reconcile any shared CSS changes. In particular, the previous undefined `.ea-button--secondary` and separate `LinkButton` Tailwind palette now use the same defined variants.

## Reusable roles

- Existing canvas/ink/wine/gold/sage roles remain. Cream, mushroom, taupe, stone, rose, blush and champagne complete the same warm palette. Success/warning/danger remain semantic. `70/20/10` is visual emphasis, not a layout calculation.
- `--font-body`, `--font-editorial` and `--type-*` define display, section, body, label, button and caption roles. `.ea-money` / `.ea-number` retain tabular numerals. No counter animation is activated.
- `.ea-surface` is a standard card. Add `--blush`, `--tonal` or `--champagne` modifiers selectively. `--interactive` is opt-in for genuinely interactive surfaces; do not lift every content card.
- Primary controls share a burgundy tonal gradient. Secondary, quiet, destructive, text-action and icon-button treatments are reusable. `.ea-pill` respects explicit ARIA selection; `.ea-toggle` styles a native checkbox and needs an associated label (and a label-sized touch target). No state is inferred by CSS.
- `--motion-press` 100ms, hover/focus 180ms, route 380ms, reveal 550ms, success 650ms, loading shimmer 1.8s. `--ease-soft` is a gentle deceleration; `--ease-standard` handles control feedback. The 8s ambient token reserves a consistent reference without activating ambient motion.
- Route content enters once from opacity 0 / 8px below to its natural visible position. No animation fill keeps an ancestor transformed afterward. The entrance targets arriving page content, so a real Suspense fallback can be replaced by content without retaining skeletons. Query/filter changes do not add an explicit remount key or reset form values.
- `data-scroll-behavior="smooth"` tells Next about existing smooth scrolling so route scroll restoration can handle it appropriately. Reduced-motion CSS uses `auto`.
- All new content is visible without JavaScript or animation support. Future JavaScript signature effects must independently check reduced motion and immediately display their real final values.

## Deferred signature work

Preserve the handoff's scroll-driven Timeline line/reveals and Wedding Day destination; real-date countdown interpolation and final-week states; successful-booking check followed by exactly one 0.8–1.2s confetti burst. Landing petals are a finite entrance. These, page-specific counters, stars, rings and choreography are not implemented in this foundation. There is no operational Wedding Week dashboard.

Design examples must not override existing financial calculations, task persistence, recommendation scores, booking identity, explicit save behavior, privacy or language policies. Functional change requests embedded in the handoff require a separate scoped decision; no such logic changes are included here.

## Page workstream ownership

| Owner | Primary files/routes | Shared coordination |
| --- | --- | --- |
| A — Public / Auth | `app/page.tsx`, `app/auth/**/page.tsx`, `components/auth/*`, public landing assets | Public header/mobile navigation stays with the single shared-navigation owner. Coordinate public CSS sections. No auth action changes. |
| B — Couple planning | `app/(couple)/wedding/**/page.tsx`, Tasks, Budget, Guests pages; `components/wedding`, `tasks`, `budget`, `guests` | Countdown/Timeline signature work; Setup crosses C's booking controls. Do not edit domain calculations/actions. |
| C — Marketplace | `app/vendors/**/page.tsx`, `app/(couple)/vendors/my/page.tsx`, `components/vendors/*` | `setup-bookings` / `vendor-typeahead` shared with B; assign one owner before edits. Public CSS and shared taxonomy are not independently edited. |
| D — Vendor account | `app/(vendor)/vendor/**/page.tsx`, `components/vendor/*` | Uses the same shell/form controls; public profile presentation belongs to C. Publication semantics stay unchanged. |
| E — Assistant visual | `app/(couple)/assistant/page.tsx`, `components/assistant/*` | Visual shell only. No provider/tool/context/language behavior changes. Shared styles remain centrally owned. |

One foundation/navigation owner exclusively edits `globals.css`, `foundation.css`, `product.css`, `public.css`, root/group layouts/templates/loading boundaries, `components/layout/*`, `components/ui/*`, and shared brand components. Page owners request shared changes rather than inventing local palettes/easing. Page-local CSS files can be introduced with agreed ownership later. The main parallelism risks are shared CSS, B/C Setup controls, and C/D public-profile components; there is no technical blocker once those boundaries are assigned.

## Verification

Run TypeScript, whole-repository ESLint, relevant Vitest and the production build. The isolated browser foundation suite uses real shared CSS/components with no Supabase/environment access:

```sh
pnpm exec playwright test --config=e2e/foundation.config.ts
```

It checks field value retention, checkbox/password behavior, shared CTA appearance, focus treatment, actual Suspense completion, reduced-motion visibility, and 1440/768/390/360px layouts. Screenshots go only to ignored `test-results/`. Existing fixture suites remain available. Live smoke testing is read-only with existing sessions; missing sessions must be reported rather than bypassed.

## Phase 2A — Public / Couple Auth calibration

Landing uses the final wide source as `public/images/landing/hero-wide-final.webp`: 2098×749, 207,976 bytes. The conversion preserves dimensions/aspect ratio; no image regeneration or artificial extension is used. The superseded unused portrait WIP asset has been removed. Couple Auth retains `public/images/auth/hands-and-rings.webp`: 1000×1499, 59,488 bytes. Auth uses the final transparent near-black illustrated source as public/brand/ever-after-logo-black.webp: 2172×724, 246,528 bytes, lossless WebP with alpha preserved. It is rendered with contain and no color filters/background. The obsolete beige rectangular WIP logo was removed after reference verification. Existing unrelated brand assets and handoff originals remain intact. Couple/Vendor brand surfaces should reuse this canonical black asset when their owning workstreams touch them; Landing remains logo-free. Next Image supplies responsive output. No runtime reference points into `project-docs/`.

`public-auth.css` contains page-scoped art direction using the existing palette, fonts, CTA, focus and motion tokens. Global foundation files are unchanged. The only shared navigation extension is an optional content slot on `PublicMobileMenu`, allowing Landing to reuse its native disclosure and Escape behavior. Other callers retain their existing links and presentation. Auth components restrict the new photo/surface/support strip to the Couple audience; fields, actions, validation and verification flow remain unchanged.

Landing uses centered logo-free navigation, existing signup/login/vendor routes, `#how-it-works`, and a concise `#about-us` section. The locked Assistant link opens a native dialog with keyboard focus containment/return; without JavaScript it remains a signup link. It does not enable AI or change authorization. The protected homepage's existing authenticated redirect is preserved.

F03 and F04 are composition targets, not general inspiration. At 1440px, Landing retains its 64px logo-free header, controlled 510px hero, 72px matte lettering, approved buttons and compact four-feature section. The new wide photograph fills the image bounds with ordinary `object-fit: cover`; desktop positioning is centered, with almost the entire supplied composition visible. Tablet/mobile use 62%/64% horizontal positioning within the existing 470px/550px hero containers. Responsive image sizes account for the full rendered cover width (1317px/1541px) rather than requesting a tiny viewport-width thumbnail that becomes blurry when cropped. The former masks, background-image continuation and narrow portrait frame are removed. No stretching, mirroring, blur or synthesized side panels remain.

The real hero-image load starts one overlapping entrance. Twelve curated SVG petals (eight on small screens) retain their independent trajectories, irregular launches over 0–720ms, individual durations of 1.8–2.42 seconds, varied tumble and three depth planes. The overlay is portaled directly into `.landing-page`, beside header/main and outside hero clipping or main-route transforms. Its absolute 100svh bounds cover the opening viewport, including header, wave and visible feature surfaces; it never captures pointers or accessibility focus. The last petal's animation-end event hides the overlay at 2.82 seconds. Scrolling dismisses it without replay; no fixed timer or particle dependency is needed. Reduced motion skips petals. Slow/failed images and no-JS retain usable content; focus within the hero exposes actions immediately.

Feature icons have a separate repeating score while their section is visible. Every cycle lasts 10 seconds, with roughly two seconds of restrained activity and the rest settled. Plan starts at 0s (outline activation, checks drawing 180ms apart); Vendors at 2.4s (outline/accent fill, maximum 1.05 scale); Budget at 4.8s (outline activation and a 3px card movement); Assistant at 7.2s (small sparks at 7.2/7.38s, larger final spark at 7.56s). CSS animations pause when the section leaves the viewport or the tab is hidden, and resume rather than restarting the score. The section reveal remains one-time. Reduced motion disables all loops and leaves finished icons visible. These ambient cycles are intentionally distinct from finite opening petals.

Couple login/signup retain F04's three-part desktop arrangement. At 1440px the roughly 410×615px image and 492px-wide form panel share a 128px top edge; Login has nearly matching vertical presence. Registration continues below the photograph without stretching it. The illustrated Auth logo is 250px wide on desktop and 180px on mobile; Landing remains logo-free. Tablet keeps the smaller photo beside the introduction, then the form below; mobile retains the 135px photo and puts supplementary benefits after the form. All fields, actions, password behavior and real pending/error handling are unchanged. Vendor Auth remains outside this scoped presentation.

Landing/Auth harmony reuses `--canvas`, `--paper`, `--blush`, `--line`, `--wine`, `--surface-blush`, `--surface-champagne`, `--shadow-soft` and `--shadow-raised`. Auth no longer has a yellow/champagne radial background or a beige panel endpoint. Its page is ivory with a 25% blush/ivory mix; the near-white panel ends in a 28% blush/white mix, controls are ivory, and champagne is limited to the small support strip. Feature-icon surfaces combine blush gradients, tonal borders and soft inset/elevation shadows. No new palette/global token edits are included.

**Carry forward to later workstreams:** richer surfaces, not new colors. Use layered ivory/blush, tonal neutral surfaces, small champagne accents, controlled shadows and purposeful hover depth. Avoid flat white-on-white layers, added pink, glow or glass effects. Translate signature motion into explicit start/active/rest states, timings, triggers, repeats and reduced-motion behavior; do not substitute a generic pulse for documented choreography. Later workstreams require explicit owner approval before starting.

Public/Auth verification:

```sh
pnpm exec vitest run tests/ui/public-auth-visual.test.tsx tests/ui/public-navigation.test.tsx tests/ui/visual-foundation.test.tsx tests/ui/product-primitives.test.tsx tests/auth
pnpm exec playwright test e2e/public-auth-polish.spec.ts e2e/public-redesign.spec.ts e2e/responsive-auth.spec.ts
pnpm exec playwright test --config=e2e/public-auth.config.ts
```

The last command runs an isolated Auth fixture whose pending promise is explicitly resolved by the test. No credentials, environment files or Supabase client are loaded. Real application checks only browse/fill controls; they do not submit live auth forms or create accounts. The targeted suite covers full-width image bounds, absence of continuation masks, image/panel top alignment, logo aspect ratio, whole-opening overlay bounds, repeated icon states, offscreen pauses and reduced motion. Current four-width screenshots and full desktop/mobile opening-plus-icon recordings are local/ignored under `.codex-tmp/public-auth-correction/`. Earlier review artifacts remain preserved. Phase 2A is committed at `fb6e74f` after owner visual review.

Deferred findings: the existing JavaScript-disabled Marketplace result-visibility assertion also fails at the protected Phase 1 checkpoint because its streamed content remains hidden. The wider responsive suite also encountered a Marketplace image-load timeout at 768px; all dedicated Public/Auth viewport checks pass. These Marketplace checks are retained, not weakened or removed. Authenticated How It Works routing and other functional handoff requests remain later scoped work; Workstream A preserves existing authenticated redirects and does not modify Marketplace rendering.

## Motion coverage — Phase 2B execution

Sources: final Design/Motion/UX DOCX (including all archive additions), twelve ZIP prototypes, and five local recordings inspected at beginning/intermediate/end frames: `conffetti.mov`, `countdown.mov`, `general decoration.mov`, `gust list.mov`, `wedding timeline.mov`. Recorded visual composition takes precedence; prototype sample data and looping Timeline behavior are not production requirements. Reference media remain ignored and local.

| Area / required motion | Source | Owner phase | Current status |
| --- | --- | --- | --- |
| Global route continuity 300–450ms, genuine skeleton shimmer, reduced motion, hover depth | DOCX / ZIP 01,02 / decoration recording | 1 | IMPLEMENTED |
| Landing finite page-level petals, overlapping entrance, living staggered icon cycles | DOCX / ZIP / imagery | 2A | IMPLEMENTED |
| Auth focus, password control, real pending shimmer and error feedback | DOCX / ZIP 03 | 2A | IMPLEMENTED |
| Our Wedding layered six-card stagger, real counters, countdown interpolation | DOCX / ZIP 07 / countdown recording + image | 2B | IMPLEMENTED |
| Timeline scroll path, milestone reveals, Wedding Day heart and restrained sparkles | DOCX / ZIP 08 / Timeline recording | 2B | IMPLEMENTED |
| Tasks category feedback, successful check → 0.6s strike → surface settle, reopen reverse | DOCX / ZIP 12 | 2B | IMPLEMENTED |
| Budget real metric entrance, fixed-value bar fill, real booking-change highlight | DOCX / ZIP 06,13 | 2B | IMPLEMENTED |
| Guest confirmed/invited ring scale/fade and semantic rows | DOCX / ZIP 16 / Guest recording | 2B | IMPLEMENTED |
| Setup step fade/slide, selected choices, completed-step progress, actual save toast | DOCX / ZIP 04,09 | 2B | IMPLEMENTED |
| Marketplace card lift/image zoom/border depth; save heart sequence + 2–3 particles; category hover | DOCX | 2C | IMPLEMENTED |
| Recommendations sparkle and Why this match reveal | DOCX | 2C | IMPLEMENTED |
| Vendor booking check → one 0.8–1.2s confetti burst → rest | DOCX / confetti recording | 2C | IMPLEMENTED |
| Vendor dashboard completion counter/fill/checklist/tint/rating/section reveals | DOCX / F08 storyboard | 2D | IMPLEMENTED — detailed choreography below |
| Vendor ratings sequential real stars; Business Profile reveal/focus/explicit save toast; publication check/tint without confetti | DOCX / F08 storyboard | 2D | IMPLEMENTED — detailed choreography below |
| Couple My Reviews card fade/rise/stagger and actual star fill | DOCX / ZIP 15 | Final completion pass | IMPLEMENTED — shared review primitives, 1.2s cards, 700ms fractional stars and real update date |
| Assistant blank/history transitions, considering ornament, context/evidence chips, response reveal and composer | DOCX §15 / F19 | 2E | IMPLEMENTED — precise score and protected boundaries below |
| Mobile lower-density motion and final cross-site reconciliation | DOCX | 2A–2E / 3–4 | IMPLEMENTED per completed workstream; full cross-site QA DEFERRED to 3–4 |

Optional identity ornament movement and tonal financial-bar breathing remain deferred to Phase 3 calibration: the primary countdown/path/ring motions establish the hierarchy first. No required signature motion is replaced with an unrelated pulse. Excel export, provider integration, SMTP and deployment are separate functional work.


### Phase 2B choreography and boundaries

The six existing Dashboard summaries remain exactly once, in two columns on desktop and one on smaller screens. Scoped Couple styles reuse the Phase 1 palette: blush Tasks, mushroom Upcoming, ivory Vendors, wine/champagne Budget, champagne/blush Guests and champagne Assistant. The existing identity/menu control is retained. The canonical transparent black logo is reused on Couple brand surfaces; Vendor navigation remains unchanged.

| Motion | Trigger → initial / active / rest | Timing, repeat, reduced motion |
| --- | --- | --- |
| Dashboard cards | First meaningful viewport entry; opacity .55 + 8px rise → resting card | 650ms shared soft easing, 100ms card stagger; once per mount. Reduced motion immediately final. |
| Real metric values | First viewport entry; decorative interpolation → actual count/money | 1.5s default, Budget 1.8s, quartic ease-out; no rerender replay. SSR and accessible label always contain the actual final value. Later server values display directly. |
| Wedding countdown | Real Israel-calendar days, first reveal; softly counts from a date-derived multiple toward the actual days | 2.2s normal / 2s final week, quartic ease-out; once. Existing day-before/day-of/post-date and development-only previews remain. No ceremony time or negative countdown. |
| Timeline | Passive scroll + resize measurement; wine/rose/champagne line extends to the reading position | Progress follows scroll, retains furthest revealed position; no timer/loop. Milestones reveal once with 8px rise/650ms. Reduced motion shows full line/content. |
| Wedding Day destination | First destination reveal; heart draws, then three small sparkles settle | Heart 1s; sparkles 800ms with 700/850/1000ms offsets; finite, no confetti. |
| Tasks | Changed server-confirmed status only; check → strike → softened semantic surface; reopen reverses | Check 220ms, strike 600ms after 200ms, settle by 1.25s; no pending/failed success. Reduced motion final status. All real filtered tasks remain in the touch/keyboard-scrollable panel; query ordering unchanged. |
| Budget | First reveal fills real budget-impact bar; width then stable | 1.8s fill. Money formula and all payment records/actions unchanged. Canonical expense highlights only when a mounted component observes a changed committed amount from refreshed server props: 1.2s finite blush, no initial-arrival success inference. |
| Guest ring | First reveal; real attending / invited ratio, scale .92 + opacity .5 → 1 | 2s once. Zero invitations have an explicit empty state. Existing household/RSVP semantics and independent estimate remain. |
| Setup | Current step enters from 18px horizontally; actual populated sections drive Details added progress | 1.1s desktop / 800ms mobile; choices 500ms; progress 800ms. Navigation clicks do not inflate progress. This visual progress does not replace persisted completion semantics or make optional fields mandatory. |
| Details save | Existing successful save redirect mounts a compact check / saved / View details toast | 650ms rise/fade; dismisses at 2.8s or manually. No persistence/action changes. Reduced motion preserves feedback. |

No schema, RLS, ownership, auth, query, persistence, financial formula, booking writer or provider/tool change belongs to this work. Shared effects live in `src/components/planning/`; page-specific CSS stays with its owning components. All new fixture actions/queries use synthetic local data and block external requests. The ignored review media live in `.codex-tmp/phase2b-review/`.

Known limits: a first arrival at Budget has no trustworthy previous canonical amount, so it does not fabricate sync feedback; a later mounted server refresh can highlight the changed item. Full signed-in Frankfurt smoke testing needs an existing authenticated session (the available browser was signed out during this pass). No test accounts or live rows were created. Optional identity float and bar breathing remain deferred to Phase 3, and, at that checkpoint, Phases 2C–2E remained untouched.


Phase 2B validation: TypeScript and whole-repository ESLint passed; all 791 Vitest tests passed in 59 files with bounded concurrency; 48 Couple fixture Playwright tests passed (Setup 12, Tasks 6, Budget/Guests 17, Countdown/Timeline 13); production build passed. Screenshots cover all six planning areas at 1440/768/390/360. Countdown and Timeline review videos are local only. The six normal local routes safely redirected the available signed-out session to Couple authentication with no 500 errors; populated application states were tested through isolated fixtures. One earlier asset-test timeout and two multi-state screenshot timeouts were resolved by bounded concurrency/appropriate test timeout, without changing product behavior or assertions. Existing mock Supabase multi-client warnings are test-environment logging, not a new runtime error.

## Shared atmospheric canvas correction

`rich-canvas.css`, imported with shared globals, owns one stationary `--rich-canvas` composition for public, Auth, workspace and vendor-profile canvases. Broad centre-out radial fields layer existing rose, blush, champagne and taupe over ivory; they contain no runtime reference imagery, overlay, animation or new palette. The original ring-shaped gradients were replaced during owner review because their one-percentage-point edges became visible bands on tall pages. Each current field fades across its full 65–95% canvas spread, with no repeated stops or outlined shape. Landing uses one page-level composition through its feature and About regions; those sections have transparent backgrounds. Contained panels retain their own readable surfaces. Auth uses the Landing CTA dimensions through `ea-brand-cta` and optional decorative Lucide mail/lock leading icons through FormField; password visibility and submit state remain unchanged. No Vendor Account or Assistant-specific redesign is included.


## Phase 2C — Marketplace and vendor discovery

Marketplace, public Vendor Profile and Our Vendors inherit `rich-canvas.css`; their scoped surfaces/interactions live in `marketplace-polish.css`. The eight category links remain canonical; an All vendors reset replaces the redundant category select. Search, area, minimum rating, subcategory and category-specific controls remain. Category motion is hover/focus only: scale 1.035 over 450ms, with a 650ms lens, note, flower, cake-detail or small rotation gesture. Cards rise 4px and images scale 1.035 over 550ms. No ambient category loop or gallery fabrication is added. Layout controls change local presentation only: comfortable two-column desktop / one-column mobile, compact three-column desktop / two-column mobile.

Display by retains directory order and offers category-scoped starting-price ascending/descending. SQL orders before pagination, keeps unknown prices last and uses ID as deterministic tie-breaker; demo mode mirrors it. This is the only query extension. Cross-category price sorting is withheld because venue per-guest prices and package prices are not comparable. Rating sorting is deferred because ratings are calculated from review rows rather than a sortable database aggregate; sorting only the current page would misrepresent the directory. Existing rating filtering and deterministic recommendation weights remain unchanged.

| Interaction | Confirmed trigger and motion | Reduced motion |
| --- | --- | --- |
| Save | This form submits, then refreshed `isSaved` changes: heart 1 → 1.15 → .95 → 1 over 650ms, three tiny particles; unsave uses a smaller 400ms return. No initial-load or pending success. | Actual filled/outline state remains; particles hidden. |
| Recommendation | Real recommended result with earned reasons only. One 800ms sparkle; native keyboard/touch disclosure opens reasons with 5px rise / 240ms. | Final icon and disclosure remain usable. |
| Booking | Supplied `conffetti.mov` reviewed as the primary sequence. This form requests Booked, then server status changes to Booked: 220ms check, headline enters after 180ms, 16 curated hearts/sparks/petals/dots burst for 1000ms after 280ms, then stable confirmation with actual vendor name. | Stable confirmation, no particles. |
| External vendor entry | One top-right action opens the complete existing form in a native dialog: 240ms backdrop, 280ms opacity / .98 scale. Business name receives focus; Escape closes and returns focus. | Immediate usable dialog. |

Feedback components observe existing server props; they do not write relationship, Budget or payment data. Failed requests clear their visual intent when real form pending settles. Query flags, existing Booked rows, bookmark changes and unrelated updates cannot trigger confetti. A remounted view without a trustworthy prior state deliberately does not fabricate a success animation. Our Vendors retains its status tabs, separate Saved state and normal Marketplace/External forms. Existing loading/skeleton handling is reused without added delays.

The fixture uses real presentation components, synthetic in-memory actions/reads, no environment files and blocked external requests:

```sh
pnpm exec playwright test --config=e2e/discovery.config.ts
pnpm exec playwright test e2e/marketplace-subcategories.spec.ts
pnpm exec vitest run tests/ui/discovery-presentation.test.tsx tests/ui/vendor-filters.test.tsx tests/domain/marketplace-subcategories.test.ts
```

Screenshots and short hover/save/booking recordings are ignored under `.codex-tmp/phase2c/`; the seven-page shared-canvas comparison is under `.codex-tmp/rich-canvas/`. Public directory/profile smoke checks are read-only. With no existing authenticated Couple session available, populated Our Vendors and mutation feedback are verified in isolation; no live QA data is created. Full signed-in redirect continuity remains a final authenticated QA check. Vendor Account and Assistant visual work remain deferred; no schema, RLS, migration, dataset, recommendation-weight or provider changes are included.

Phase 2C validation: TypeScript and whole-repository ESLint passed; the full Vitest suite passed all 802 tests in 60 files, followed by a 12-test presentation rerun after compact-card refinement. Ten isolated Marketplace browser checks passed at 1440/768/390/360, including keyboard disclosure, dialog focus/return, compact rating containment, pending/failure feedback, stale intent and reduced motion. Six existing read-only Marketplace filtering tests passed. The final production build and diff whitespace check passed. Existing mock Supabase multi-client warnings and browser-runner color warnings are unchanged test logging.


### Canvas and logo correction — pending owner visual review

The stationary wash uses existing `--canvas`, `--cream`, `--rose`, `--blush-accent`, `--champagne` and `--taupe` only. Three large overlapping radial fades (rose 14%, champagne 16%, taupe 10% at their strongest points) and one broad ivory/cream base replace all narrow ring stops. `background-repeat: no-repeat` prevents tiling. No burgundy field, blur filter, pseudo-element, new animation or pointer layer is added. Cards, CTA tokens and completed motion remain unchanged. All current public, Auth, workspace and profile selectors share this recipe; no future motion coverage is marked complete by this correction.

`public/brand/ever-after-logo-black.webp` remains the sole active illustrated runtime mark. Its decoded 2172×724 RGBA pixels exactly match the authoritative `ever-after-logo-transparent-black.png`: all four corners have alpha zero, with 1,386,030 fully transparent pixels. Opaque line channels range from 23 to 37 (near-black). No conversion or duplicate asset was needed. The old opaque `ever-after-approved.png` was still used by Wordmark and PublicHeader; these consumers now use the canonical mark. PublicHeader reuses Wordmark. Old negative-position cropping, multiply blending and grayscale/contrast filters are removed in favour of full contain sizing and transparent, borderless, shadowless wrappers. Landing navigation remains logo-free. The historical asset is preserved, but no runtime component references it.

The maintained Public/Auth browser suite now decodes the actual optimized browser image on Auth and Marketplace, verifies zero-alpha corners and dark linework, and checks transparent wrappers / contain sizing. Local comparison screenshots are ignored under `.codex-tmp/tonal-wash-review/`, including eight pages at 1440/768/390/360 and a desktop comparison sheet. Populated private pages use existing synthetic fixtures; public reads use the local app. No live mutations or test accounts are involved. This correction is intentionally uncommitted pending owner approval.


Landing-only follow-up: the solid ivory `hero-wave` SVG and separately positioned feature-section canvas created a pale strip at their join. The same curve now masks only the hero media/contrast layer, revealing the uninterrupted page wash beneath. Hero height, content, scroll control and page-level petals are unchanged. The Landing canvas adds one broad lower-right blush field (`--blush-accent` at 22%, fading across a 95% × 65% ellipse) to the shared wash; this is a Landing-only atmosphere variant, not a second palette or an animated background. Auth, logos and other pages remain unchanged by this follow-up. Review screenshots are local/ignored under `.codex-tmp/landing-wash-refinement/` at 1440/768/390/360. Changes remain uncommitted and unstaged.

Landing/global rich-canvas refinement remains visually open for the final cross-site consistency pass.


## Phase 2D — Vendor Account

The canvas checkpoint is `a350d94` (`Refine landing rich canvas`). Landing/global rich-canvas refinement remains visually open for the final cross-site consistency pass. No further Landing/Auth/canvas changes belong to Phase 2D.

References: final Design/Motion/UX DOCX, archive F08 supplier storyboard and review/save references; all five supplied recordings were inspected through their extracted frame sequences (confetti, countdown, general decoration, guest list, wedding timeline). There is no Vendor-specific recording. F08 and DOCX sections 17–20 therefore define Vendor choreography. Booking confetti is deliberately not reused.

The existing Vendor shell and canonical transparent black logo remain. Vendor-scoped CSS reuses `--surface-standard`, `--surface-blush`, `--surface-tonal`, `--surface-champagne`, shared wine/rose/gold/success/line/shadow tokens and `--ease-soft`. Completion uses blush, ratings and gallery use champagne, matching details use mushroom/stone, and basic/pricing/contact sections use controlled ivory. The current global canvas is unchanged.

`calculateVendorProfileCompletion` remains the only completion calculation, with all eight saved requirements unchanged. The presentation maps its existing next-step labels to distinct icons and actual profile anchors. Hash navigation focuses the appropriate control. Dashboard publication is a saved-state summary plus a link to the existing profile visibility switch; the explicit profile save remains the sole publication edit operation. No second mutation or optimistic live state is introduced.

| Vendor motion | Status | Trigger → choreography / timing / rest |
| --- | --- | --- |
| Profile completion counter | IMPLEMENTED | First viewport reveal, 0 → actual saved percentage, 1700ms quartic ease-out, tabular numerals. Later values update directly, no rerender replay. |
| Completion bar | IMPLEMENTED | First panel reveal, scale 0 → actual width over 1400ms soft ease-out; subsequent actual percentage changes transition width. |
| Checklist completion | IMPLEMENTED | Compare real saved next steps with the last observed snapshot for that profile in this browser's in-memory App Router lifetime. Newly satisfied requirement draws check (550ms), reveals completed label treatment (700ms), and settles into success tint (750ms). Already-complete first arrivals are final, without success replay. No local/session storage, no database state or fake progress. A hard reload has no trusted prior snapshot and deliberately does not celebrate. |
| Completion milestones | IMPLEMENTED | Saved percentage crosses presentation ranges 50/75/100. Restrained inline encouragement; at 100: “Your profile is ready to shine ✦”. No stored milestone or confetti. |
| Rating entrance | IMPLEMENTED | First visible rating, 0.0 → actual aggregate rounded for display, 1500ms. Accessible/SSR value is final immediately. |
| Star fill | IMPLEMENTED | Actual fractional/unfilled star widths, 650ms opacity/scale and clipped fill reveal, 100ms per-star offsets. No fabricated fifth star. |
| Review card entrance | IMPLEMENTED | First viewport entry, 12px rise + fade over 1000ms, 100ms card stagger. |
| Review-star entrance | IMPLEMENTED | Same accurate 650ms / 100ms sequential fill inside the revealed card; real reviewer display name, date, text and RTL support retained. |
| Business section reveals | IMPLEMENTED | Once on viewport entry, 12px rise over 700ms. Offscreen content is only slightly subdued, not hidden. Keyboard focus immediately reveals the section. |
| Input-focus draw | IMPLEMENTED | Burgundy underline expands from field centre to full width over 240ms; shared visible focus outline retained. |
| Save pending/success | IMPLEMENTED | Existing server action, explicit Save → Saving… → Saved ✓. Shimmer exists only during real pending. Further field edits return the button to Save. Errors display without success. |
| Save toast | IMPLEMENTED | Successful server result only, check + “Business profile saved”, 12px rise/fade over 600ms; manual dismissal or 4500ms display lifetime. No artificial request delay. |
| Publication success | IMPLEMENTED | Previously private + explicit publish submission + successful server result only; 500ms check and 800ms soft reveal, “Your profile is live”, contact guidance and public-profile link when available. No confetti/modal. |

Every animation disables under reduced motion, leaving final values, partial stars, fields and feedback visible. Changing reduced-motion preference during a running counter finishes it immediately. Section focus is usable before animation ends. The existing grid of up to four recent reviews is retained: it lets vendors scan feedback without carousel controls or additional query/state logic. Empty ratings have a restrained star and first-review message.

The upload action already stores the original file without client downsampling. Gallery `sizes="33vw"` underestimated mobile display width; it now declares full-width mobile, half-width tablet and a bounded desktop image size. Original file quality, 5MB validation, storage paths, ownership and image mutations are unchanged. Low-resolution originals cannot be recovered through CSS; inspection of any particular real upload remains read-only follow-up when an authenticated Vendor session is available.

No schema, migrations, RLS, authorization, query, publication semantics, action implementation, matching rule, review data or AI change. There is no new dependency. The available local browser has no authenticated Vendor session; `/vendor` safely redirects to Vendor authentication. No account was created.

Validation commands:

```sh
pnpm exec tsc --noEmit
pnpm exec eslint . --max-warnings=0
pnpm exec vitest run tests/ui/vendor-account.test.tsx tests/domain/vendor-profile.test.ts tests/application/vendor-onboarding.test.ts tests/application/security-boundaries.test.ts
pnpm exec playwright test --config=e2e/vendor-account.config.ts
pnpm exec next build --webpack
```

The Vendor fixture serves actual presentation components with in-memory synthetic records and actions on port 3110. It loads no environment files; Storage and auth operations throw, and external browser requests are blocked. Screenshots at 1440/768/390/360 plus populated/empty/private/publish-success states and a finite-motion recording are ignored under `.codex-tmp/phase2d-review/`. Review media are not runtime assets. Assistant visual work remains deferred to Phase 2E; remaining cross-site motion requirements retain their future ownership.


Phase 2D validation: TypeScript, whole-repository ESLint, 52 focused Vitest checks (presentation, completion, onboarding and role boundaries), eight isolated Vendor Playwright checks, production build and `git diff --check` passed. The first cold Vite startup exceeded the original 30-second browser timeout; the fixture timeout is now 60 seconds and the full responsive/state set passed unchanged. Motion capture additionally verifies focused underline draw and edited-after-save button feedback. No live Vendor session was available; authenticated publication and uploads were not exercised against Frankfurt.


### Phase 2E — Wedding Assistant presentation

The Assistant uses the existing rich canvas and typography with a mushroom conversation rail, ivory reading panel, blush user messages, warm-neutral assistant messages, champagne composer and alternating blush/champagne suggestions/context chips. `assistant.css` is scoped to this experience; shared navigation, palette and prior motion are unchanged. Landing/global rich-canvas refinement remains visually open for the final cross-site consistency pass.

Opening `/assistant` starts blank in Automatic/English. New chat resets the view without deleting or creating database records. Suggestions fill the composer for review; explicit Send (or Ctrl/Cmd+Enter) uses the unchanged POST endpoint. The existing title-from-first-question and message persistence remain authoritative. The composer holds submitted text while pending, clears on acknowledged acceptance, restores focus after becoming enabled and preserves safe unsaved-message retry. Explicit Hebrew selection and automatic bilingual detection remain unchanged.

New read-only history Server Actions reuse `getOwnedWedding` (authenticated Couple guard), scope threads to its wedding ID and verify selected-thread ownership before reading messages. Thread pages contain 30 records, message pages 50, each with one lookahead; older history remains accessible. Failed/forged reads return the same safe unavailable result. Stale selection responses cannot replace a new view. These are application presentation readers, not new Agent tools; they do not change provider history/context or executable capabilities. The page sends only bounded display strings for saved styles, area, guest count, total budget and first priority. Missing data produces no invented chips; these describe current Wedding Details, not reasoning or historical evidence.

| Motion | Status | Trigger / score |
| --- | --- | --- |
| Blank-state entrance | IMPLEMENTED | First/new blank view: 550ms, opacity .5 → 1 and 8px rise; final content never depends on a timer. |
| New chat / conversation switch | IMPLEMENTED | Successful view selection or New chat: 320ms, opacity .6 → 1 / 6px rise. Only the conversation view moves. |
| Considering ornament | IMPLEMENTED | Real POST pending only: `✦ ❦ ✦`, 2.4s soft alternating opacity/3px movement, 0/400/800ms offsets. Unmounted immediately at completion. |
| Considering your wedding | IMPLEMENTED | Visible status text through actual request pending; static and understandable without motion. |
| Context-chip sequence | IMPLEMENTED | Up to five real display chips; 400ms / 5px rise, 100ms stagger on availability. No provider planning is exposed. |
| Response reveal | IMPLEMENTED | Actual new message: 450ms / 8px rise, no character typing or fake streaming. Stable keys prevent replay during typing. |
| Evidence-chip sequence | IMPLEMENTED | Actual existing source labels: 400ms / 5px, 100ms stagger. Unknown labels remain hidden; no research claim is fabricated. |
| Conversation-row hover/active | IMPLEMENTED | Shared 180ms tonal hover, wine active edge and accessible current-page state. |
| Composer / Send | IMPLEMENTED | Shared wine CTA, 100ms press, 180ms focus depth; disabled only for real pending/unavailable states. |
| Mobile conversation panel | IMPLEMENTED | Below 1024px, native modal dialog with contained focus, Escape/close and focus return; 320ms entry. |

Reduced motion disables all of the above animation/transition styles and shows final chips/messages/static ornament immediately. The five supplied recordings were inspected; none is an Assistant recording. The DOCX §15/F19 therefore controls this phase; ZIP loading/transition examples inform timing only, with their simulated waits excluded.

Validation uses the closed Assistant fixture (port 3101), with synthetic histories, real presentation components and optional actual Couple shell. Auth is stubbed to deny operations; environment files are not loaded and browser external requests are blocked. No live conversations are created. The sweep covers 320/360/390/430/480/540/600/640/700/768/820/1023/1024/1280/1440, including both sides of collapse. Review screenshots/recording stay ignored under `.codex-tmp/phase2e-review/` and `test-results/`.

Real OpenAI, live research and provider tool-calling remain NOT STARTED for the later functional phase. Agent READ tools, local deterministic answers, provider abstraction, evidence/privacy rules, ownership, database schema and writes are unchanged. Final cross-site consistency/motion QA remains separate.


## Final completion pass — authoritative current motion inventory

This inventory supersedes the phase snapshots above, including their remaining-page and final-QA deferrals. The final DOCX was reread; all twelve ZIP prototypes, the Vendor storyboard and all five supplied recordings were inspected again. Recordings: `wedding timeline.mov`, `countdown.mov`, `conffetti.mov`, `gust list.mov`, `general decoration.mov`. The ZIP contributes timing/shape references only: no prototype script, fixed example value, autosave simulation or looping Timeline is shipped.

Each row below is one independently checkable motion requirement (compound DOCX sections are split into these checkpoints). All effects preserve real domain state. Reduced motion always exposes final values/content; decorative loops stop. No artificial request delay or fake streaming is added.

| ID | Motion requirement | Status | Implementation / trigger / timing |
| --- | --- | --- | --- |
| G01 | Route continuity | IMPLEMENTED | PageTransition, real App Router template remount; 380ms / 8px; no auth or routing change |
| G02 | Genuine loading skeleton | IMPLEMENTED | PageLoading on interactive Couple/Vendor routes, only Suspense pending; warm 1.8s shimmer. Public Marketplace renders complete server HTML without its route-level streaming fallback so no-JS visitors can read results |
| G03 | Reduced motion and final content | IMPLEMENTED | Shared foundation plus component media guards; final SSR content, static pending feedback; live preference changes settle reveals |
| G04 | Control hover, focus and press | IMPLEMENTED | Shared 180ms hover/focus and 100ms press; visible keyboard outline |
| L01 | Hero image establishment | IMPLEMENTED | Actual image readiness; 950ms opacity; entry links remain usable while loading |
| L02 | Whole-opening petal event | IMPLEMENTED | 12 curated independent paths/depths; fewer on mobile; finite approximately 3s; page-level pointer-transparent overlay |
| L03 | Overlapping hero choreography | IMPLEMENTED | Image → eyebrow/title/ornament/tagline/copy/actions; overlapping 1100ms stages, approximately 2–3s overall |
| L04 | Feature section reveal | IMPLEMENTED | One observed entrance; focus keeps controls available |
| L05 | Checklist feature icon | IMPLEMENTED | 10s restful stroke/check cycle, 0s offset, paused offscreen/hidden |
| L06 | Heart feature icon | IMPLEMENTED | 10s restful small fill/scale cycle, 2.4s offset; no large heartbeat |
| L07 | Wallet feature icon | IMPLEMENTED | 10s restful tiny detail movement, 4.8s offset |
| L08 | Assistant feature icon | IMPLEMENTED | 10s restful sequential sparkle accents, 7.2s offset |
| A01 | Auth focus draw | IMPLEMENTED | Shared accessible outline plus 240ms wine underline |
| A02 | Password visibility control | IMPLEMENTED | Accessible eye toggle preserves value and actual input semantics |
| A03 | Auth CTA hover/press/arrow | IMPLEMENTED | Same ea-brand-cta as Landing; small arrow movement and shared depth |
| A04 | Real authentication pending | IMPLEMENTED | Actual pending label and shimmer only; no timer-based success |
| A05 | Auth success/error feedback | IMPLEMENTED | Actual action feedback, visible and understandable without movement |
| S01 | Setup step continuity | IMPLEMENTED | 1100ms desktop / 800ms small screens, 18px slide/fade, on actual step change |
| S02 | Setup selected choice feedback | IMPLEMENTED | Tonal selected surface and wine accent; real selected values |
| S03 | Setup progress | IMPLEMENTED | 800ms transition from completed step data, not clicks or invented progress |
| S04 | Wedding Details saved toast | IMPLEMENTED | Successful existing redirect only; 650ms / 12px, dismissible after 2.8s |
| C01 | Real wedding countdown interpolation | IMPLEMENTED | AnimatedValue quartic ease-out 2200ms normal / 2000ms final week; once on reveal, tabular real final number |
| C02 | Final-week/date states | IMPLEMENTED | Real Israel date: normal, final week, Tomorrow, Today is the day, Just married; no negative count or ceremony time |
| C03 | Dashboard card sequence | IMPLEMENTED | Exactly six existing cards; 650ms entrances with 100ms stagger |
| C04 | Dashboard metric values | IMPLEMENTED | Real summary values, once on reveal; stable across unrelated rerenders |
| C05 | Wedding Day sparkle | IMPLEMENTED | NEW: one small date-triggered 1600ms sparkle; no replay on minute renders, no confetti, static under reduced motion |
| T01 | Progressive Timeline path | IMPLEMENTED | Scroll/resize measurement; furthest visible progress retained; no timer loop or backward erase |
| T02 | Timeline milestones | IMPLEMENTED | Observed 650ms / 8px rise, current workflow and deadline states retained |
| T03 | Wedding Day destination | IMPLEMENTED | Drawn heart 1000ms, three small staggered 800ms sparkles; destination is distinct |
| K01 | Saved Task completion | IMPLEMENTED | Successful state only: 220ms check → 600ms strike → 1250ms surface/layout settle |
| K02 | Task reopen | IMPLEMENTED | 200ms check removal / 600ms reverse strike / 650ms surface return; no persistence change |
| K03 | Task filters | IMPLEMENTED | Real category/status selection, shared hover/focus and active feedback; Waiting stays incomplete |
| B01 | Budget metrics | IMPLEMENTED | Real values interpolate 1800ms once; formulas untouched |
| B02 | Budget progress fill | IMPLEMENTED | Real defined committed/budget ratio; 1800ms transform, never fabricated width |
| B03 | Booked expense refresh highlight | IMPLEMENTED | 1200ms after a mounted canonical committed amount changes; no fake highlight without a trustworthy prior value |
| R01 | Guest attendance ring | IMPLEMENTED | Real attending/invited ratio, 2s scale .92→1 and opacity .5→1; zero remains neutral |
| R02 | Guest metric counters | IMPLEMENTED | Real aggregate counts, finite AnimatedValue entrance |
| R03 | Guest row feedback | IMPLEMENTED | Existing real RSVP states use quiet semantic tonal surfaces; no data change |
| M01 | Marketplace category interactions | IMPLEMENTED | 650ms category-specific hover/focus accents, no ambient row animation |
| M02 | Vendor card elevation | IMPLEMENTED | Restrained 3–5px hover lift and warm border/shadow depth |
| M03 | Vendor image response | IMPLEMENTED | Small image zoom with 550ms transition; responsive crop preserved |
| M04 | Saved-heart success | IMPLEMENTED | Actual saved transition: 1→1.15→.95→1 over 650ms plus three small particles |
| M05 | Unsave response | IMPLEMENTED | Actual unsave transition, 400ms reverse treatment; no booking celebration |
| M06 | Recommendation sparkle | IMPLEMENTED | One 800ms accent only when actual deterministic recommendation exists |
| M07 | Recommendation explanation | IMPLEMENTED | Actual reasons in keyboard-operable disclosure; 240ms reveal |
| M08 | Marketplace filters/density | IMPLEMENTED | Existing query and density behavior with shared selected/focus states |
| M09 | External-vendor dialog | IMPLEMENTED | Native modal, 280ms entry, focus containment/Escape/return; existing operation unchanged |
| M10 | Booking celebration | IMPLEMENTED | Real local booking intent plus saved Booked transition only; check → confirmation → one 1000ms burst after 280ms; failure/bookmark/load cannot trigger |
| V01 | Vendor completion counter | IMPLEMENTED | Saved profile completion, 1700ms first reveal, no fabricated intermediate milestone |
| V02 | Vendor completion bar | IMPLEMENTED | Same actual completion, 1400ms fill/update |
| V03 | Checklist completion | IMPLEMENTED | Real newly completed field: 550ms check, 700ms label, 750ms success surface; existing completed items start finished |
| V04 | Completion milestone treatment | IMPLEMENTED | 50/75/100 presentation thresholds from real data, restrained message/icon, no confetti |
| V05 | Aggregate rating entrance | IMPLEMENTED | Real rating, 1500ms finite interpolation; no-review state remains an intentional star/empty message |
| V06 | Rating star fill | IMPLEMENTED | Actual fractional/unfilled stars; 650ms with 100ms stagger |
| V07 | Recent review entrance/stars | IMPLEMENTED | Real review data; 1000ms / 12px card entrance and sequential stars; existing grid retained instead of unnecessary carousel |
| V08 | Business form section reveals | IMPLEMENTED | Observed 700ms / 12px, once; focus exposes controls immediately |
| V09 | Business input focus draw | IMPLEMENTED | 240ms wine underline plus accessible shared focus |
| V10 | Save pending/success | IMPLEMENTED | Real Save → Saving… → Saved; pending-only 1500ms shimmer; no autosave |
| V11 | Profile saved toast | IMPLEMENTED | Real success only, 600ms / 12px, dismissible; no fake result |
| V12 | Publish success | IMPLEMENTED | Saved publication state only; 500ms check + 800ms soft success reveal; no confetti |
| AI01 | Blank new-chat entrance | IMPLEMENTED | 550ms / 8px, intentional blank state; histories preserved |
| AI02 | New chat/conversation switch | IMPLEMENTED | 320ms / 6px content continuity; shell stays still |
| AI03 | Considering ornament | IMPLEMENTED | Real response pending only; 2.4s alternating ornament, 0/400/800ms offsets; static with reduced motion |
| AI04 | Context-chip sequence | IMPLEMENTED | Up to five real safe display fields; 400ms / 5px with 100ms stagger; no hidden reasoning |
| AI05 | Response reveal | IMPLEMENTED | Actual response, 450ms / 8px; stable keys and no character typing |
| AI06 | Evidence/source reveal | IMPLEMENTED | Real permitted labels, 400ms / 5px and 100ms stagger; no invented live-research claim |
| AI07 | Conversation row states | IMPLEMENTED | 180ms tonal hover/wine active marker, readable titles |
| AI08 | Composer and Send | IMPLEMENTED | Shared control language, real pending/disabled state, accepted submission only |
| AI09 | Mobile conversation panel | IMPLEMENTED | Below 1024px native dialog, 320ms entry, focus containment/Escape/return |
| RV01 | My Reviews card entrance | IMPLEMENTED | NEW: existing VendorReveal reused, 1200ms / 12px, bounded explicit 150ms card stagger |
| RV02 | My Reviews star sequence | IMPLEMENTED | NEW: existing fractional VendorStars reused, 700ms / 100ms stagger; real updated date and bilingual text retained |
| ST01 | Settings save feedback | IMPLEMENTED | NEW: successful avatar action only, shared 650ms toast / 2.8s dismissal; failures retain inline feedback |
| D01 | Continuous canvas gradient drift | INTENTIONALLY DEFERRED | The owner rejected visible bands and motion shapes; retain stationary broad tonal fields. Optional revisit only during post-approval production performance QA. |
| D02 | Floating identity/avatar and repeating countdown sparkle | INTENTIONALLY DEFERRED | Optional ZIP ornament; keep the countdown as the primary motion and avoid perpetual identity movement. Future owner-approved decorative calibration only; the separate real Wedding Day sparkle is implemented. |
| D03 | Ambient financial-bar breathing | INTENTIONALLY DEFERRED | Optional ZIP effect. Keep dense financial views calm and ratios visually stable. Future owner-approved production motion calibration only. |
| D04 | Unspecified site-wide floating flowers/ornament | INTENTIONALLY DEFERRED | Optional atmosphere, not a required signature. Landing already has finite petals; extra decorative loops risk competing with functional content. Future owner-approved decorative assets/performance pass only. |

**Inventory: 76 checkpoints — 72 implemented and 4 intentionally deferred optional atmospheric effects.** No required signature motion is replaced by a generic fade. The written spec's prototype example values never become stored data. Password changes keep the existing reauthentication confirmation rather than introducing a toast that disappears during the required sign-in redirect.

### Final consistency and responsive corrections

The existing broad radial canvas is retained. Landing's lower blush return is broadened to a 110% × 85% field at 60%/85%, using the existing blush-accent at 24% opacity. This is a small stationary tonal adjustment, with no stripes, narrow stops, new colors or duplicated page recipes. The owner remains the authority for final visual approval.

My Reviews now shares the existing review/star primitives, shows the actual update date in the Israel timezone, preserves fractional rating and bilingual text, and requests an appropriately sized mobile image. Settings uses the existing standard/blush/tonal surfaces and shared destructive button, removes the two internal account/session explanations specified by the DOCX, and adds success-only avatar feedback. The Couple and Vendor native file inputs now have zero minimum width and fill their available container, fixing the newly found 320px overflow. Vendor image upload uses the shared primary CTA; upload/storage behavior is untouched. PlanningReveal now settles on keyboard focus and a live reduced-motion change.

Side-by-side mobile review found that the legacy label/value row rule conflicted with the newer two-column Budget overview: labels could wrap one letter per line without causing document overflow. Below the existing 640px boundary, each metric now stacks its label, fluid-size amount and description within its tile. A dedicated browser assertion checks two-line label readability and amount containment at 320/360/390/480/600/640px. No formulas or values change. Fixture shells also load the real Couple-layout stylesheet and actual logo image rather than an empty image stub.

The canonical illustrated mark remains `public/brand/ever-after-logo-black.webp`; Landing navigation remains logo-free. Existing font families, token roles, meaningful status colors, navigation architecture and all previously implemented motions remain intact.

### Verification and review material

Maintained responsive sweeps cover 320, 360, 390, 430, 480, 540, 600, 620, 639, 640, 700, 767, 768, 820, 900, 1023, 1024, 1080, 1280 and 1440px. Full pages are mounted with synthetic records and closed query/action aliases where authentication is needed. The final fixture also tests real-component Settings success/failure presentation, actual fractional review stars/dates, bilingual text and empty Budget/Guest/Review states. No live records are created.

Run the additional closed fixture with `pnpm exec playwright test --config=e2e/final-design.config.ts`; other fixture commands remain unchanged. Screenshots, contact sheets, recordings and logs are ignored under `.codex-tmp/final-design/`. The final validation results and any environment-only limitations are recorded in the completion report.

Real OpenAI/provider tool-calling/live research, Excel export, Email/SMTP, full JWT/Storage HTTP adversarial production QA and Vercel remain intentionally deferred to their separately authorized functional/production phases. No new provider, tool, dependency, schema or migration is introduced here.

Public progressive enhancement: the previous Marketplace route-level loading boundary left completed server content in React streaming placeholders when JavaScript was disabled. Its one-line `vendors/loading.tsx` export is removed; public listing/profile responses can now complete as ordinary server HTML. Couple/Vendor workspace skeletons, templates, page transitions and all queries/auth rules are retained. This changes loading presentation only and is covered by the existing no-JavaScript public navigation test.

### Final validation outcome

TypeScript, whole-repository ESLint and the production build pass. Full Vitest: 62 files / 826 tests pass. Browser coverage comprises 110 isolated fixture tests (Foundation 7, Auth feedback 2, Budget/Guests 17, Setup 13, Tasks 7, countdown/Timeline 16, discovery 12, Vendor 9, Assistant 22, final-design 5) and 64 maintained Public/Auth/Marketplace/boundary tests. All pass after targeted reruns of corrected test observations: profile navigation must reach its h1 rather than match the previous card heading; lazy images must scroll into view; finite Task motion is observed at animation start rather than after it can expire. The existing no-JavaScript public test passes against the local production server.

The 20-width sweep covers every major visual area. Review material includes 83 page/state screenshots, six desktop/mobile contact sheets, and Landing, booking, countdown/Timeline, Vendor and Assistant recordings under the ignored `.codex-tmp/final-design/` directory. Live public/authentication-route smoke checks are read-only; private-page state coverage uses isolated fixtures, not a newly created account or live record. Existing image assets are unchanged; all 291 Marketplace runtime assets and all 64 dedicated newer-vendor primaries remain tracked. Canonical logo alpha is 0 at each corner, with near-black opaque linework (RGB channels 24–37).


### Phase 5.6 — Assistant presentation

Safe react-markdown rendering supports paragraphs, emphasis, lists, restrained headings and protocol-limited links. Raw HTML and images are excluded. Message direction follows the first language-bearing text, independently of role alignment. The Assistant page reuses the cached existing Couple identity reader and passes only avatar choice and photo URL, never profile IDs, names or storage paths. The existing photo/error fallback component is reused. Assistant sparkle and Couple avatar accompany warm editorial surfaces; pending dots stop with the existing request state and become static under reduced motion. Existing suggestions also fill the composer in active conversations without submitting. Source labels retain existing evidence semantics. No semantic callout engine or new source type is introduced.

The footer now reads “Answers can use your wedding profile, tasks, vendors, and budget.” Formatting guidance changes presentation only; Phase 5.5 scope/tool-selection and agorot rules remain intact. History titles and active selection are preserved; no history dates are invented because the existing summary contract supplies no timestamps. Message timestamps use existing created_at.

Validation uses the isolated Assistant fixture host (external browser traffic blocked), bilingual Markdown fixtures, responsive desktop/intermediate/mobile screenshots, reduced-motion and transport regressions. Review artifacts remain ignored under .codex-tmp/phase2e-review and test-results/assistant-visual. No live Assistant turn is used for this review. Owner visual acceptance remains pending.
