# Scalability Design

## Target and current posture

The MVP is designed for dozens to hundreds of active users on Vercel plus the existing Supabase Free
project in Frankfurt (wedding-planner-project-eu, eu-central-1). The Marketplace has 496 fictional
vendors, 8 categories, 27 subcategories, 2,727 reviews and 291 tracked images. The architecture intentionally favors simple indexed server queries over queues, caches, or
microservices that are not yet justified.

## Query and data shape

- Marketplace attribute filters run in PostgreSQL; server-side rating aggregation completes the
  logical filtered search before returning the ordinary 12-vendor page.
- Common task, relationship, payment, review, and assistant-history paths have compound indexes.
- GIN indexes support vendor array filters for areas, styles, services, and event types.
- Public and private reads are separate so public cards cannot accidentally select Couple notes.
- Dashboard reads wedding-scoped task/financial rows for authoritative totals and renders a small
  upcoming selection. These underlying per-wedding reads can grow with the wedding.
- Assistant context is limited to one wedding and relevant task/vendor/budget fields; the legacy
  message-history query is capped at 100 rows. Dedicated Agent history limits are documented separately.
- Timeline derives from the indexed Task source rather than maintaining duplicate rows.

The initial implementation calculates rating averages from selected reviews. This is correct and
simple for small data. At higher marketplace volume, a transactionally maintained aggregate table or
materialized view can expose average/count without transferring every review into a vendor-list query.

## Index inventory

- unique profile/wedding/vendor owner identifiers and vendor slug;
- `tasks(wedding_id, status, due_date)`;
- `couple_vendors(wedding_id, status)` and `couple_vendors(vendor_id)`;
- `budget_items(wedding_id)`;
- `payments(budget_item_id, is_paid, due_date)`;
- `reviews(vendor_id, is_public, created_at desc)`;
- `vendor_profiles(is_public, category_id, subcategory_id)` and price/capacity indexes;
- GIN vendor array indexes;
- assistant thread/message chronological indexes.

Indexes have a write/storage cost, so additional indexes should follow measured `EXPLAIN ANALYZE`
results rather than guesswork.

## Client/server separation

Server Components keep database credentials/session handling and bulk data off the client. Client
JavaScript is reserved for interactions. URL filter state is shareable and avoids a global store.
Server Actions invalidate only affected routes. Next Image provides responsive delivery for approved
remote hosts; uploads are size-limited.

## Bounded Agent reads

The ten internal READ tools authenticate server-side and validate bounded outputs. Marketplace output
defaults to 12 vendors (maximum 20); rating-filtered pagination scans deterministic candidate chunks
under a hard cap and fails unavailable if completeness cannot be proved. Aggregate reads are batched
and capped; partial totals are never reported as complete. See AI_AGENT_SPEC.md for exact tool limits.
The Local provider still has a documented monolithic context compatibility path; bounded tool output
does not imply every ordinary Tasks/Budget/Our Vendors page query is paginated.

## Growth path

### Hundreds to low thousands of users

- Measure slow queries through Supabase logs and add justified indexes.
- Switch marketplace pagination from offset to stable cursor pagination when deep pages become common.
- Select explicit public card columns instead of broad profile columns.
- Paginate My Vendors, Tasks, payments, gallery, and reviews after real list sizes justify it.
- Cache public taxonomy and published vendor-card reads with safe invalidation.
- Add database-side aggregate functions for Dashboard totals to reduce round trips.

### Larger workloads

- Maintain rating/profile aggregates asynchronously or transactionally.
- Generate image derivatives at upload time and place a CDN in front of public media.
- Add connection-pooling and query-concurrency review for the selected Supabase/Vercel plans.
- Add durable queues for expensive Assistant/provider work and upload processing.
- Add per-user/IP rate limits, request tracing, error monitoring, and cost budgets.
- Partition or archive large assistant/audit histories only after retention/volume measurements.

## Heavy-query risks

The marketplace nested review query, Dashboard multi-query assembly, and Assistant context assembly are
the first areas to profile. N+1 requests are avoided by relational selects and parallel independent
queries, but a database RPC/view may be cleaner if profiling shows round-trip pressure. Search is
currently case-insensitive substring search; PostgreSQL full-text/trigram search is a future upgrade
if catalog size or typo-tolerance requirements grow.

## Service and cost limits

Free-tier quotas are a valid academic constraint. The application must degrade gracefully when a
quota is reached and must never enable billing automatically. Monitor database/storage/egress limits,
Vercel function duration and bandwidth, and any future AI token usage. A paid upgrade requires the
user's explicit approval after explaining the need and free alternatives.

## Current limitations

Frankfurt is connected and migrated, but no load test has been run against live data. Ordinary
Marketplace rating filtering uses server-side application aggregation and may read more candidates
than one output page. Offset pagination and rating aggregation should be profiled before larger scale. The default local Assistant
is deterministic and inexpensive; an external model would introduce latency, rate, privacy, and cost
constraints that need a separate capacity plan.
