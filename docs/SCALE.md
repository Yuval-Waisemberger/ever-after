# Ever After — Basic Scalability

## 1. Purpose and current scale

Ever After is a multi-user wedding-planning application built with Next.js, Vercel and Supabase.
It supports public visitors, Couple accounts and Vendor accounts across public Vendor discovery and
private wedding-planning workflows.

The academic MVP is designed for dozens to hundreds of users within the quotas of the selected
Vercel and Supabase plans. The current marketplace contains roughly 500 fictional Vendor profiles,
about 2,700 reviews and almost 300 tracked local WebP assets. Ordinary marketplace pages return 12
Vendors instead of the complete catalog.

No formal live load test has been performed. Scalability claims in this document therefore describe
the implemented architecture, query bounds and concurrency tests—not a guaranteed production SLA.

## 2. Dozens or hundreds of users

The Vercel application tier is stateless: a request verifies its session, performs the required
server work and returns a result without depending on shared in-memory application state. Vercel can
serve concurrent requests through separate function invocations.

Supabase provides the shared PostgreSQL database, Auth and Storage. Private queries resolve one
authenticated Couple's wedding or one Vendor's business, so one user's tasks, guests and payments
are not loaded with every other user's data. This keeps most reads and writes small as accounts grow.

At higher concurrency, the practical limits are expected to be Supabase connections and quotas,
Vercel function limits and external AI-provider capacity. These limits should be monitored before
public growth; paid plans or automatic credit reloads must not be enabled without explicit approval.

## 3. Queries that may become heavy

The main areas to profile as data grows are:

1. **Marketplace filtering and ratings.** Multiple attribute filters and rating aggregation may
   examine more rows than the final 12-Vendor page.
2. **Our Wedding Dashboard.** It combines task, Vendor, budget, payment and Guest List summaries from
   several wedding-scoped reads.
3. **Large planning lists.** Tasks, guests, payments, reviews and Couple-Vendor relationships could
   require pagination for unusually large histories.
4. **Marketplace text search.** Case-insensitive substring search is sufficient today, but full-text
   or trigram search would scale better and support typo tolerance.
5. **Review averages.** Calculating averages from review rows is simple now; maintained aggregates or
   a materialized view would be cheaper for a much larger marketplace.
6. **Assistant context.** Several bounded sources may be combined, although provider latency usually
   dominates database time.

New indexes or caches should follow evidence from Supabase logs and `EXPLAIN ANALYZE`, rather than
being introduced without a measured bottleneck.

## 4. Database indexes

The schema includes indexes for the main ownership, filter and ordering paths:

| Area | Representative key or index | Main use |
| --- | --- | --- |
| Identity | Unique profile, wedding-owner and Vendor-owner identifiers | Ownership resolution |
| Vendors | Unique slug and public/category/subcategory indexes | Catalog and profile reads |
| Vendor attributes | GIN indexes on areas, styles, services and event types | Array filters |
| Tasks | `(wedding_id, status, due_date)` | Tasks, Timeline and Dashboard |
| Couple Vendors | `(wedding_id, status)` plus Vendor lookup | Saved/booked workflows |
| Budget | `budget_items(wedding_id)` | Wedding financial totals |
| Payments | `(budget_item_id, is_paid, due_date)` | Schedules and upcoming payments |
| Reviews | `(vendor_id, is_public, created_at desc)` | Public/owner review views |
| Assistant | Thread/message chronological indexes | Bounded history reads |

Primary keys, foreign keys and uniqueness constraints also support direct lookups and prevent
duplicate canonical relationships. Additional indexes have write and storage cost and should be
added only when query measurements justify them.

## 5. Avoiding unnecessary data loading

- Server Components perform initial reads and return only page-relevant data.
- Private queries are restricted to the authenticated wedding or Vendor.
- Public Vendor reads are separated from private ownership and Couple-planning fields.
- Marketplace result pages are bounded; details load only for the selected Vendor.
- Dashboard cards use summaries rather than copying entire management pages.
- Timeline entries derive from Tasks instead of duplicating the same information.
- Independent server reads can run in parallel where appropriate.
- Next Image and WebP assets support responsive media delivery.
- Assistant tools use explicit projections and bounded results; Guest data is aggregate-only.

These decisions reduce query work, response size and privacy risk together.

## 6. Pagination and list growth

The marketplace uses server-side pagination with 12 Vendors per ordinary page. Filtering applies to
the logical result set instead of loading the full catalog into the browser. Assistant Vendor tools
also enforce small default and maximum outputs.

Most private lists are not paginated because a single wedding is expected to contain a manageable
number of rows. The demonstration Guest List currently represents 100 invited people in 31 household
records and remains responsive. This is a functional check, not a load test.

If Tasks, Guests, payments or personal reviews regularly reach hundreds or thousands of rows per
account, server pagination or virtualization should be added. Deep marketplace navigation should
move from offset to cursor pagination when measurements show that deep offsets are significant.

## 7. Client/server separation

The browser owns temporary interaction state: dialogs, drafts, filters, mobile navigation and
feedback. Shareable marketplace filters and page state use URL parameters rather than a large global
client store.

The server owns session verification, role/ownership resolution, protected reads, validation,
business calculations, mutations and AI-provider access. Server Actions revalidate affected routes;
Route Handlers are used where an HTTP boundary is appropriate. This keeps private bulk data and
secret-holding logic outside the client bundle and leaves the application tier stateless.

## 8. Bounded Assistant workload

Real-AI execution has explicit capacity and cost controls:

- 500 admitted turns globally and 150 per Couple;
- one active real-AI request per Couple;
- at most four model rounds and six custom tool calls;
- at most one research-adapter request and one built-in search;
- a 30-second whole-turn deadline and zero automatic retries;
- bounded output and conversation history.

Admission is atomic in PostgreSQL. Disposable-database tests covered the 500/501 and 150/151 limits,
concurrent final-slot races, idempotency and terminal uncertain results. This proves the counter and
concurrency rules, but not real-provider throughput under hundreds of simultaneous users.

At larger scale, slow AI work should move to a durable queue with backpressure and user-visible job
status. The Local deterministic provider remains available without paid-provider traffic.

## 9. Current limitations and future improvements

Current limitations include free-tier quotas, no formal load test, no distributed application cache,
single-region data, some unpaginated private lists, substring search, inline AI processing and no
general background-job system.

If real measurements justify expansion, the priorities are:

1. Monitor slow queries, function duration, errors, database connections and provider usage.
2. Maintain review and Dashboard aggregates closer to the database.
3. Add cursor pagination and paginate large private lists.
4. Cache low-change public taxonomy and published Vendor cards with safe invalidation.
5. Adopt full-text or trigram search for a larger catalog.
6. Generate image derivatives and use an appropriate CDN for public media.
7. Move AI and media processing to durable background queues.
8. Review connection pooling, region placement and infrastructure-plan limits.
9. Add tracing, alerts and explicit cost monitoring.
10. Run repeatable load tests in a safe staging environment before raising capacity claims.

## 10. Conclusion

Ever After supports basic scalability through stateless Vercel execution, indexed and ownership-
scoped PostgreSQL queries, bounded marketplace pages, selective data loading and strict Assistant
limits. This is appropriate for the academic MVP. The main future pressure points—marketplace
aggregation, long personal lists, Dashboard round trips, media processing and AI execution—are
identified and can be improved independently when measured usage requires it.
