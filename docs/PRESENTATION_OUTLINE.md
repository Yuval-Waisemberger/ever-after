# 10–15 Minute Presentation Outline

## 0:00–1:00 — Problem and promise

Couples often split planning across notes, spreadsheets, chats, and vendor tabs. Ever After creates
one calm workspace: “Your wedding. One place. Less chaos.” Introduce Couple, Vendor, and Guest roles.

## 1:00–2:00 — Requirements and architecture

Show the separately submitted final Product Specification, then the architecture: Next.js on Vercel, Supabase
PostgreSQL/Auth/RLS/Storage, Server Components for reads, Server Actions for mutations, and a small
server-only Assistant provider. Emphasize one source of truth and RLS as the real authorization layer.

## 2:00–8:30 — Main product demo

1. Start logged out on the vintage landing page and show the three entry paths.
2. Register/sign in as a Couple; show the short setup and “Skip for now.”
3. Open My Wedding: real task/vendor/budget summaries and incomplete-setup reminder.
4. Edit partial Wedding Details; show neutral Not set values rather than invented data.
5. Create a dated “Pay photographer deposit” task; show it in both Tasks and Timeline.
6. Explore Photography & Content, filter vendors, and explain a recommendation badge/reasons.
7. Save/consider two photographers and ask the Assistant to compare them.
8. Point out source labels: Couple data, Internal vendor database, or General guidance.
9. Book one vendor; show My Vendors and Dashboard update.
10. Enter an agreed price in the booking flow; show the database-created canonical Budget commitment.
    Record an actual payment separately in Budget and explain Paid versus Available.
11. Ask “What tasks do we have this week?” and show the answer uses actual Task data.

Show Guest List/RSVP aggregate counts. Demonstrate the local date-area countdown preview: final week,
Tomorrow, Today is the day and Just married. There is no operational Wedding Week dashboard.

## 8:30–10:00 — Vendor and public experiences

Switch to a Vendor account: profile completion, profile/services/area/pricing fields, gallery, rating,
and read-only Couple reviews. Then show a logged-out public profile. Explain that only published data
is public.

## 10:00–12:00 — Database, security, and business logic

Show the normalized schema and ownership graph. Explain one RLS example for Couple isolation and one
for Vendor owner-only updates. Explain integer agorot, payment formulas, and deterministic weighted
recommendation evidence/threshold. Mention that proxy/session redirects improve UX but do not replace
RLS.

## 12:00–13:30 — Testing and scalability

Show passing TypeScript, ESLint, Vitest, build, Playwright, and RLS evidence. Describe pagination,
compound/GIN indexes, bounded Dashboard/Assistant queries, and the planned rating aggregate/cursor
pagination growth path.

## 13:30–15:00 — Limitations and next steps

Be explicit: real external AI/live research and Vercel deployment are still pending; no paid AI, no automatic Assistant writes, no payment processing, no seating/calendar/
WhatsApp, and Helper access remains second priority. Explain the confirmed-action design and secure
temporary Helper link as future work. Finish with the live Vercel URL and GitHub URL once available.

## Backup questions

- Why no Redux? Server/database state, URL filters, and small local interaction state are sufficient.
- Why Server Actions? Internal form operations need no redundant REST API.
- Why a Route Handler for Assistant? It provides a clean validated JSON/provider boundary.
- Why Supabase Auth? It integrates sessions and RLS ownership with the required database stack.
- How is recommendation different from AI? It is a pure weighted function with disclosed evidence.
- What prevents cross-user access? RLS policies derive ownership from `auth.uid()` for every table.
- What happens with no AI key? The deterministic local provider works and current web research declines
  transparently.
- What would scale first? Aggregate ratings, measure/index queries, cursor pagination, cache public
  catalog data, and add background media/provider work only when volume warrants it.
