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

## Later workstreams (not started)

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
