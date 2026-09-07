# Security Design

> Agent privacy, grounding, scope, persistence and future write controls: see [AI Agent Specification](AI_AGENT_SPEC.md).

## Security objectives

Private Couple planning, financial, vendor-note, and Assistant data must never cross wedding
boundaries. A Vendor may edit only its own business/media and never Couple reviews. Guests see only
the intentionally public marketplace. Secrets stay server-side or outside Git.

## Authentication

Supabase Auth email/password is used for Couple and Vendor identities. SSR clients use secure cookie
sessions. Server-side protected routes verify the user through Supabase rather than trusting a UI
flag. Email confirmation behavior is controlled in the existing Supabase project. The `proxy.ts`
session refresh improves continuity but is not an authorization boundary.

One shared Couple login represents both partners, as required by the product specification. Phone
numbers are profile data, not credentials. The database signup trigger creates the matching profile
and wedding/vendor row; only `couple` and `vendor` roles are accepted.

The local Auth readiness changes are described in [AUTH_SECURITY_READINESS.md](AUTH_SECURITY_READINESS.md).
Migration `202609040001_profile_role_permissions.sql` restricts authenticated profile updates to
`display_name` and `phone`, in addition to existing own-row RLS. It must be applied before relying
on immutable account roles. Callback redirects are strictly application-relative; signup and resend
use the configured site origin and Supabase's existing PKCE/token/email infrastructure.

## Authorization and RLS matrix

| Resource | Guest | Couple | Vendor |
|---|---|---|---|
| Taxonomy | read | read | read |
| Published vendor profile/media | read | read | read |
| Vendor profile mutation | none | none | own only |
| Public reviews | read | read/create/update own | read only |
| Wedding Details | none | own only | none |
| Tasks | none | own only | none |
| Couple-vendor status/private notes | none | own only | none |
| Budget/payments | none | own only | none |
| Assistant threads/messages | none | own only | none |

All public-schema tables enable RLS. Table grants and policies both apply: grants expose only the
operations a role may attempt; policies restrict eligible rows and writes. Helper functions such as
`owns_wedding` and `owns_vendor` are security-definer functions with a fixed empty search path and
explicit schema references. The application never treats hidden navigation as security.

Foreign keys used in child inserts are also checked by policies. For example, a payment insert is
allowed only when its budget item belongs to the current user's wedding. Client-supplied ownership
IDs therefore cannot grant access.

## Input and output protection

- Zod validates all server mutation and assistant boundaries.
- PostgreSQL constraints repeat critical numeric, enum, range, and relationship invariants.
- Supabase's query builder uses parameterized requests rather than hand-built SQL.
- React escapes displayed user content. No raw HTML renderer is used.
- Search text is length-limited and punctuation used by PostgREST's OR expression is stripped.
- Assistant messages are capped at 3,000 characters and receive only scoped context.
- Errors shown to users avoid connection strings, stack traces, tokens, and SQL details.

## Storage

The `vendor-media` bucket accepts only the owning Vendor's `{vendor_id}/...` path. The browser checks
JPG/PNG/WebP and 5 MB maximum size before upload; database metadata and RLS verify ownership again.
Only an image owned by the signed-in Vendor can be removed. Seeded demo rows use checked-in local WebP
paths and cannot be mutated by ordinary users.

The current bucket is public because published marketplace images must render without privileged
tokens. This means an uploaded object's URL can be public before the Vendor publishes the profile if
someone can guess it. Generated object names use UUIDs, reducing discovery, but a future hardening
option is a private bucket with signed URLs or a promotion step from private drafts to public media.

## Secret handling

`.env.local` is ignored. `.env.example` contains names/placeholders only. The normal application needs
only the browser-safe Supabase project URL and publishable key. It does not need a service-role key or
database password. Never commit or paste the following into chat/docs/source:

- database passwords or connection strings with passwords;
- service-role or Supabase secret keys;
- AI/provider private keys;
- private access tokens.

Any future AI key must use a server-only variable without `NEXT_PUBLIC_`. Vercel secrets belong in
Project Settings, not repository files. Before every future commit, inspect staged files and ensure
`AGENTS.md`, `.env.local`, keys, passwords, and generated test artifacts are absent.

## Assistant safety

The default local provider has no network or paid dependency. It labels Couple data, internal vendor
database facts, and general guidance separately. It refuses to pretend that time-sensitive external
research was performed. It currently cannot execute writes. A future write flow must create a
structured proposal, revalidate arguments and ownership, display the exact change, require explicit
confirmation, expire old proposals, and log the result.

## Known risks and future improvements

### Assistant READ-tool boundary (Phase 1B)

All ten tools require a fresh verified `auth.getUser()` identity, Couple role and wedding resolved
from `owner_user_id`. Even the public Marketplace tools in this Agent registry require that Couple
session. Input schemas reject extra keys, including client/model wedding IDs. Private reads scope
to the resolved wedding; payment reads scope through an inner Budget-item ownership join; external
vendor hydration repeats wedding ownership. Public vendor and review reads require `is_public`.
RLS remains defense in depth and no service-role credentials are used.

The allowlist contains only the ten reads documented in [AI_AGENT_SPEC.md](AI_AGENT_SPEC.md).
The server executor rejects unknown/prototype/write/research names. There is no arbitrary table,
SQL, action executor, HTTP tool endpoint or provider access to the DB client. Every input and final
result is Zod-validated. Null/error/malformed sources and aggregate caps fail unavailable without
data or factual evidence; safe errors omit raw exception messages.

Privacy audit of every tool:

| Area | Allowed output | Excluded from query/output |
| --- | --- | --- |
| Wedding | Planning preferences, date, budget/setup/venue state | Account IDs, Couple names/phones/emails, avatars, auth metadata |
| Tasks/Timeline | ID/title/category/date/priority/status and derived timing | Task notes |
| Budget/Payments | Deterministic totals; bounded deadline labels/amounts/category | Expense/payment notes and unrelated private vendor data |
| Couple vendors | Saved/lifecycle/agreed price and source-tagged vendor planning facts | Private relationship/external-vendor notes, phones, emails and other contacts |
| Marketplace/comparison | Public planning attributes and aggregate ratings; minimal match preferences | Raw reviews/reviewer identities, contacts, account ownership |
| Guest List | Exactly five counts | Every Guest name, phone, email, dietary/private note and individual row |

Guest queries select only RSVP status and invited/attending counts; only computed counts leave the
tool. Other aggregate source rows also remain internal. Explicit projections and nested output
allowlists prevent extra fields from reaching results. Permitted free text such as task titles can
still contain sensitive text typed by users; this is not a general PII detector. No auth credentials,
tokens or keys enter tool output. Future vendor-contact access needs a separate narrow authorized
tool and reviewed planning use case.

Tool bounds limit each invocation, not aggregate use across a future conversation. Authentication
and output filtering do not replace future scope, prompt-injection, rate/call-count, cancellation
and cost controls. Mocked tests cover query scoping/privacy/error behavior; no live RLS verification
or Supabase data mutation is claimed for this phase. No migration/schema/RLS/seed file changed.

- Add rate limiting for auth, reviews, search, uploads, and Assistant endpoints at production scale.
- Add malware/image decoding checks and server-side resizing for uploaded media.
- Add security headers/CSP tuned to Supabase and approved image domains.
- Add audit records for sensitive mutations and confirmed Assistant actions.
- Add breached-password/MFA options if the product moves beyond an academic MVP.
- Run automated dependency/security updates and review Supabase advisories.
- Verify all RLS cases with real test identities after migrations are applied.
- Use short-lived, hashed, revocable, field-allowlisted tokens if Wedding Helper is implemented.

## Security verification checklist

### Phase 1C-B planning and conversation

The planning builder consumes fresh authenticated tool outputs and actual invocation metadata
inside the server boundary. It is not a new public endpoint; a client/model must never manufacture
the source bundle, eligibility flags, follow-up snapshot or authorized-ID list. Input/output Zod
allowlists preserve minimal wedding/task/payment/vendor fields and aggregate-only Guest facts.
Unavailable reads stay null/limited, filtered vendor pages cannot prove a missing booking and
stale dated snapshots are rejected. Signals reference deterministic reasons and source classes;
they contain no executable writes. Existing ten-tool authorization and RLS defenses are unchanged.

The optional history reader reauthenticates, requires Couple role and proves wedding/thread
ownership before reading recent messages. It selects no account/contact fields or action proposals,
does not read other threads and distinguishes query failure from empty history. Limits are eight
messages (nine-row lookahead), 2,000 characters per included message and 10,000 total. Chat content
is untrusted and may contain PII voluntarily typed by the user: it stays server-local with
`providerReady: false`; no claim of automatic semantic redaction is made. Future provider disclosure
requires relevance/privacy minimization. It can never be passed directly to external research.

Follow-up pointers carry IDs only, expire after 15 minutes, are checked against both wedding and
thread and must be resolved against freshly authorized vendor IDs. Old tool statuses do not prove
current facts. Raw tool payloads, Guest identities, contact fields and private notes are rejected.
Quote proposals use strict controlled fields, bound numeric package facts and reject unknown/free
text properties. Wedding context is reused, then existing research normalization coarsens date and
guest scale. Research remains disabled; no LLM, SDK/key, paid service, write, schema or data mutation.

### Phase 1C-A research preparation

The research definitions are separate inactive contracts with no execute method. The active
registry remains the ten Phase 1B READ tools. There is no network client, search API, scraper,
provider implementation, credential variable or product write path in the new research layer.

Research input uses controlled wedding service/topic/feature enums and the app's broad Israeli
regions. Unknown/private properties are rejected. Normalization omits all names, phones/emails,
Guest identities, auth/wedding IDs and private notes; local offer text is discarded, exact wedding
day becomes a month and guest count becomes a 50-person band. Procedures omit unrelated event
context. A second strict schema validates the actual adapter payload. This avoids forwarding
private free text; it does not authorize future disclosure without privacy/retention review.

Structured domain and verification flags must be established by a future server boundary, not
trusted merely because a client/model supplies them. Unrelated scope redirects; uncertain scope
needs clarification. Closed research topics prevent generic browsing even in a proposed request.
Current factual claims require verified current evidence; unavailable/insufficient states cannot
carry prices or result data. General advice must retain its recommendation label.

Source validation requires consistent timestamps, matching HTTPS domain, credential-free URLs
and bounded metadata. Provenance checks require source records and research time to match a
trusted server retrieval receipt and request context to remain unchanged. No receipt producer
exists yet. These checks prevent relabelling registered Marketplace/advice references as external/
Couple evidence; they do not prove arbitrary text true or a source current. External source
content is untrusted. Before implementation, retrieval needs SSRF/private-network protection,
redirect validation, prompt-injection handling, source-quality/freshness assessment and tests.
No URL is fetched by these contracts. Future call/time/account/cost limits must be enforced before
enablement; there is no automatic expensive-provider fallback. Local still rejects external evidence.

Before deployment, use at least two Couple accounts, two Vendor accounts, and an anonymous session.
Attempt cross-wedding reads/writes, cross-vendor profile edits, Vendor review edits, unpublished vendor
reads, forged ownership IDs, excessive payment totals, invalid ratings, oversized uploads, and direct
access to every protected route. Record the results in the test report; do not infer RLS success from
the UI alone.

## Phase 2 language and Assistant UI boundaries

Language selection is local deterministic processing. Only `he`/`en` hints cross the existing authenticated Assistant API; they cannot select a wedding, widen context or authorize a tool. The existing context privacy allowlist, aggregate-only Guest output, evidence validator and ten READ registrations remain in force. Chat text can contain user-entered sensitive information and is not claimed PII-free. No text is sent to an external language/AI/research service.

Messages render as React text, not HTML/Markdown injection. Bidi isolation changes presentation only; it does not rewrite stored names. Known source labels are allowlisted for display. A chip is a category label, not proof of a new retrieval; current external evidence is still rejected by the live Local result guard. Structured clarifications expose controlled planning questions, not raw contracts/debug data or executable actions.

The client validates replies and uses controlled localized error messages rather than raw API errors, SQL details or provider configuration strings. User-message persistence must succeed before generation, as before. Only an explicit failed user insert enables direct retry; no automatic replay follows an unknown network outcome. Failed history reads disable sending. Language and clarification metadata require no migration and add no private account fields to context.

Phase 2 browser tests use synthetic in-memory conversations on an isolated local component host. All API responses are mocked and external browser requests are blocked; no live authenticated Assistant message is sent or Supabase QA row created. This does not substitute for future authorized live authentication/RLS integration testing. No AI SDK/key, paid service, product write tool or live research is enabled.


## Database-owned booking commitments (050003, pending reviewed application)

Canonical Budget rows cannot be created, detached, reclassified or have their commitment overridden
by ordinary authenticated Budget writes. Manual items cannot acquire relationship links. The sync
trigger uses SECURITY DEFINER with an empty search path, fixed SQL and no callable RPC interface;
EXECUTE is revoked from PUBLIC/anon/authenticated. The Budget guard permits only the nested trigger
running as that function's trusted migration owner, never a caller-settable configuration flag.
Relationship identity/ownership is immutable, and existing RLS remains defense in depth.

Deletion of a relationship with any linked canonical item is blocked, including External Vendor
cascade deletion. Canonical Budget deletion is blocked; deletion of any expense with payment rows
is also blocked. Consequently account/wedding hard-deletion with financial history requires a
separate explicitly reviewed retention workflow, not an accidental cascade. Empty saved-only
placeholders remain removable. Explicit authorized payment correction/deletion remains available;
no sync path deletes or changes payments automatically.

Schedule mutations lock their parent item to serialize totals with concurrent schedules and price
changes. New amounts/increases must fit active commitment. Historical excess following a price
reduction remains representable. Existing payment identity/parent cannot be moved. Payment actions
require Couple ownership, reject unavailable validation reads, and return safe errors on DB failure.
Budget/vendor failures never expose SQL text or claim a successful trigger transaction.

Tests in this phase use isolated mocks/component fixtures only. No Frankfurt connection, mutation,
new credentials, schema application, migration ledger change or AI capability is authorized here.


## Setup booking integration

All Setup actions resolve the authenticated Couple's owned wedding; the shared wedding query now
also filters owner_user_id explicitly. Caller-supplied wedding/External IDs are rejected by the strict
Setup booking contract. Marketplace IDs are re-read as public and checked against the chosen actual
subcategory/category. External rows receive server-owned wedding identity and real taxonomy IDs.
Existing RLS and 050003 protect ownership, relationship identity and canonical financial history.

Shared internal relationship operations preserve omitted fields; minimal Setup forms cannot clear
private notes, contact fields or independent bookmarks. Setup writes no financial records. Declaration
updates use fresh updated_at compare-and-set; preferences retain a submitted original revision to
reject stale whole-form writes. Neither client-selected ownership nor hidden-field omission bypasses
server validation. Failed/uncertain creation must be reviewed, not automatically replayed.

Booking summaries/pickers expose planning identity/taxonomy only, no routine contacts/private notes.
Unavailable/capped reads are explicit. The Assistant registry remains ten READ tools; declarations
are distinguished from actual bookings. No external provider, language service or research is added.
QA uses mocked queries and isolated localhost fixtures with external requests blocked; no Frankfurt
Setup/vendor/financial data is used for mutation QA.

## Task waiting status boundaries (2026-09-07)

Waiting is a user-selected enum, not vendor authorization or an inferred vendor link. Server actions
retain authenticated Couple role checks and server-resolved wedding ownership. Task ID plus owned
wedding ID scopes every edit/status/delete; database RLS remains defense in depth. Invalid enums,
UUIDs, read/write failures and zero matching rows cannot produce false success. Database errors are
replaced with safe messages. Draft fields survive validation failure; no new public endpoint exists.
Assistant task context still excludes notes and other private fields, and the ten-tool allowlist
remains read-only. No external AI/language service, research or credentials were introduced.
Local SQL tests use a network-isolated disposable Docker PostgreSQL container, no published ports,
synthetic records and no live credentials. Public schema is real; the minimal Auth stub is not
Supabase Auth/RLS integration validation. Mocked application tests also exercise actual role and
ownership resolution. Implementation QA did not contact Frankfurt. The subsequent authorized live
closeout applied only the approved enum addition after read-only preflight. Task row fingerprints,
ownership constraints, indexes and RLS were unchanged; authenticated smoke checks made no data writes.


## Date countdown and local previews (2026-09-07)

The final-week treatment adds no queries, actions, contact exposure or permission changes. Existing
Couple authentication, wedding ownership and RLS remain unchanged. Preview parameters are parsed
only for development on exact localhost/loopback hosts; production ignores them. They change only
a presentation clock anchored to the stored wedding date, never task deadlines, payments, actual
dates, records, cookies or storage. There is no preview write endpoint. The browser timer only
updates component state. No external AI/service/library or schema change was introduced.

## Final role hardening (Frankfurt applied, 2026-09-07)

`202609070002_role_boundary_hardening.sql` is a security-only migration applied to Frankfurt after
explicit approval and catalog preflight. The preceding policies allowed an authenticated Vendor to create
an owned wedding, and a Couple to create an owned Vendor profile through direct database access.
The new restrictive role policies intersect existing ownership policies. `owns_wedding`,
`owns_budget_item`, `owns_assistant_thread` and `owns_vendor` also require the correct stored
profile role, denying downstream access even for legacy wrong-role parents. Profile roles remain
immutable to authenticated clients; signup uses the existing trusted initialization trigger.

A new relationship INSERT must reference a public Marketplace vendor (or an owned External
Vendor under the existing composite FK). Previously a forged unpublished vendor ID could reach
050003's SECURITY DEFINER sync and reveal the private business name through a canonical expense.
Existing relationships remain manageable if a business later unpublishes; identity changes are
still forbidden by 050003. No second Budget writer or payment path was added.

Vendor-profile deletion previously cascaded into Couple-owned relationships/reviews regardless
of child RLS. Those two FKs now use RESTRICT. A Vendor can edit/unpublish their own profile but
cannot erase Couple history by deleting the parent. Financial protections in 050003 stay intact.
No records are merged, deleted or backfilled by this security migration.

Guest actions now require an affected owned row before reporting success. Missing and forged IDs
produce the same safe failure. Signup actions no longer return raw provider/trigger error text.
Other reviewed mutations resolve `requireRole`/`getOwnedWedding` server-side and scope entity IDs
to that owner; client IDs are never ownership authority. Assistant API thread lookup includes the
owned wedding, and every one of its unchanged ten READ tools freshly authenticates. Guest data
remains aggregate-only; task/private vendor notes are excluded from routine Assistant outputs.

Storage design remains unchanged: couple-media is private, role/UUID-namespace scoped; vendor-media
is intentionally public marketing imagery, including object URLs after unpublishing a profile.
Do not upload private documents there. Writes require the owned Vendor namespace. SQL policy tests
cover reads/writes/deletes/path reassignment; browser upload and signed-URL HTTP authorization are
not reproduced by the local PostgreSQL harness. No Storage architecture changes are introduced.

The approved closeout applied only this complete transactional file through a fresh SQL Editor
query. Clipboard verification matched the repository text after line-ending normalization, with
no partial selection. Live function, policy and FK definitions match the migration; all relevant
private tables retain RLS. Counts and aggregate whole-row fingerprints for nine application tables
were identical before/after, with no wrong-role parents or invalid references. Storage and other
unaffected policy definitions also retained the same fingerprint. No live QA rows were created.
Earlier manual migration history remains non-authoritative; no ledger change or db push was used.
Full Supabase JWT adversarial and Storage HTTP boundary checks remain Final Production QA.
