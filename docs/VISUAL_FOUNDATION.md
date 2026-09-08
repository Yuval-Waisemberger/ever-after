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
| Vendor dashboard completion counter/fill/checklist/tint/rating/section reveals | DOCX / storyboard | 2D | DEFERRED — business account scope |
| Vendor ratings sequential real stars; Business Profile reveal/focus/explicit save toast; publication check/tint without confetti | DOCX / storyboard | 2D | DEFERRED — business account scope |
| My Reviews card fade/rise/stagger and actual star fill | DOCX / ZIP 15 | 2D | DEFERRED — review owning workstream |
| Assistant ornament, considering state, sequential context chips, response reveal | DOCX | 2E | DEFERRED — chat visual workstream |
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

`rich-canvas.css`, imported with shared globals, owns one stationary `--rich-canvas` composition for public, Auth, workspace and vendor-profile canvases. Oversized elliptical gradients layer existing rose, blush, champagne and taupe over ivory; they contain no runtime reference imagery, overlay, animation or new palette. The Landing feature region uses the same composition with a taller background size to avoid compressed stripes. Contained panels retain their own readable surfaces. Auth uses the Landing CTA dimensions through `ea-brand-cta` and optional decorative Lucide mail/lock leading icons through FormField; password visibility and submit state remain unchanged. No Vendor Account or Assistant-specific redesign is included.


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
