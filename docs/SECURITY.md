## Current AI status — Phase 7

This current-status section supersedes historical phase snapshots below that describe Local-only operation, inactive research, unconfigured admission or pending live QA. Those snapshots record what was true at their named phase, not current execution switches. OpenAI is explicitly selectable; Local remains the credential-free default. Exactly ten internal READ tools and two separate research tools are executable. Product writes are not exposed. Phase 5 live QA and the final official-research revalidation are complete; known admitted usage is 15. The final research turn returned a qualified partial result with three validated government sources. Market benchmark completeness is not established by that procedural live test.

The current adapter requests strict `text.format` JSON Schema and included `web_search_call.action.sources`. Findings bind to exact returned action-source/citation URLs and server-issued source IDs. Server policy controls HTTPS safety and authority; retrieval does not prove publication freshness. Missing source package context prevents verified benchmark ranges. Partial/insufficient evidence is a safe result, not a promise of a complete current answer. Mocked tool-selection tests establish policy delivery and execution plumbing, not guaranteed model compliance.

Limits remain: 500 global/150 per-Couple admitted turns, no short-window throttle, one active request per Couple, no quota refund or redispatch for terminal uncertain results; four main rounds with answer-only round four, six custom calls, 30 seconds, zero retries, 1,200 output tokens per model response, 10,000 final characters; one research adapter request/search and min(15 seconds, remaining deadline). Local bypasses admission. Research shares the logical turn's admission. Server secrets remain private and are not required for offline tests. Assistant color/surface refinement remains deferred; no UX redesign is part of final AI validation.

Historical phase records follow. Current implementation details and the focused structured-output correction take precedence over their earlier capability statements.

## Phase 6B research boundary

Research is separate from the unchanged internal READ executor. Only two closed-schema research functions are admitted, with privacy normalization before the adapter. The adapter cannot receive ToolContext, database clients, identity, raw prompts or history. One invocation is reserved before execution per turn; failures do not refund it. The existing admission and 4-round/6-call/30-second bounds remain, with a 15-second/remaining-deadline abort for the single research request. No retry, alternate-provider fallback, WRITE capability or short-window throttle was added.

The server-only adapter uses the existing zero-retry SDK client and exposes only web_search with HTTP max_tool_calls=1. Citations must match returned search-action sources or SDK annotations; URL credentials, non-HTTPS URLs, malformed domains and custom ports fail. Authority and publisher independence come from server policy, never model claims. Unknown sites cannot become official sources. Package mismatch and insufficient independent evidence prevent typical ranges. Provider-extracted dates alone do not certify freshness: usable material remains qualified/partial, stale material insufficient.

Turn-local receipts are identity-bound and mutation-detected. Response evidence and text are attested; altered source URLs and forged evidence fail. This validates provenance, not the truth of every generated sentence. Safe diagnostic events omit all queries, source text/URLs and private content. No UI, secrets, migrations, RLS, quotas or business data changed. Validation uses blocked network and injected transport; the final authorized procedural live QA passed with qualified partial evidence.

# Security Design

## Phase 5.3 diagnostic privacy boundary

The server-only `assistant/diagnostics.ts` console sink accepts fixed stage, outcome,
provider, tool and error-code enums; bounded numeric counts; and the existing
validated request UUID. Unknown properties are stripped, invalid enum values are
dropped, and serialization/log-sink exceptions are swallowed. AsyncLocalStorage
isolates concurrent requests without changing provider contracts or authorization.
There is no environment lookup, external sink, database write or logging SDK.

Never pass prompts, history, Couple/Wedding/user IDs, tool arguments/results,
financial values, guest details, raw upstream errors, headers or credentials to
diagnostics. Tests use synthetic private sentinels, network blockers, a throwing
sink, concurrent scopes and mocked failures. The request UUID correlates events
only; it grants no access. Console availability/retention is not guaranteed, so
absence of a diagnostic event is not proof of absence of spend or execution.

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

Migration `202609040001_profile_role_permissions.sql` restricts authenticated profile updates to
`display_name` and `phone`, in addition to existing own-row RLS. It is applied in Frankfurt and protects
immutable account roles. Callback redirects are strictly application-relative; signup and resend
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
and output filtering do not replace future scope, prompt-injection, quota/call-count, cancellation
and cost controls. Mocked tests cover query scoping/privacy/error behavior; no live RLS verification
or Supabase data mutation is claimed for this phase. No migration/schema/RLS/seed file changed.

- Add rate limiting for auth, reviews, search, and uploads at production scale.
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


## Database-owned booking commitments (050003 applied in Frankfurt)

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

## Real-AI admission — applied infrastructure, private configuration still required

`202609080001_assistant_real_ai_admission.sql` was **applied and verified in Frankfurt in Phase 1C**. It enforces
500 global / 150 per Couple / one active request, with a transaction
advisory lock and READ COMMITTED snapshots. No short-window AI admission rate limit is enforced.
No deletion, failure or uncertainty refunds quota. Supabase Auth rate limits are unaffected.
Phase 1B makes uncertain terminal: its completed timestamp is set and active slot released, while
the unit remains consumed. No redispatch, automatic retry, late completion or expiry is permitted.
Crash-left admitted/dispatched rows remain fail closed pending separately approved reconciliation.

Browser roles cannot read/write/truncate the ledger or execute its three functions. RLS has no
policies. The approved migration grants function execution only to service_role (and owner),
revoking direct ledger ACLs even from service_role. Its BYPASSRLS does not bypass those ACLs. No custom
executor/login is created. A service-role key remains a broader backend credential elsewhere in the
project; confinement to a server-only, narrow RPC module is essential, not a substitute for key security.

The RPC channel is constructed lazily and fails closed without private configuration. Local bypasses it before any credential,
ledger or connection access. API ownership checks precede admission; client UUID/digest/ownership
claims cannot grant authority. Only the server hashes normalized request semantics. Fixed errors omit
SQL/roles/locks/secrets. Explicit Next server dependencies protect the hashing, lifecycle and RPC modules.
No privileged key, live provider configuration, network research or billing was added.
See [AI admission design](AI_AGENT_SPEC.md#real-ai-phase-1a1b--local-admission-guardrails-2026-09-08)
for channel comparison, terminal-state semantics and later configuration approval requirements.

### Real AI Phase 4B — server-only admission client

The existing RPC module imports `next/headers` to enforce Next's server-only boundary and now
constructs a dedicated Supabase JS client only inside getAdmissionChannel(). It reads the existing
NEXT_PUBLIC_SUPABASE_URL and private SUPABASE_SERVICE_ROLE_KEY. The key must never have a
public prefix, enter props/browser code, or be committed/logged. URL checks require an HTTPS origin
without credentials/path/query/fragment; key checks validate shape only, not live credential validity.

No user-session/cookie client is reused. Auth persistence, refresh and URL detection are false.
PostgREST retries are explicitly false. The client remains enclosed by the existing adapter exposing
only admit/claimDispatch/finish; no generic RPC, table method or direct ledger CRUD is available.
Both returned and thrown RPC failures, including construction/configuration failures, become fixed
safe errors with no raw cause/headers/key. The execution boundary retains ADMISSION_UNAVAILABLE.

The underlying service-role secret is broadly privileged within Supabase; the narrow adapter is an
application boundary, not a claim that the secret is restricted project-wide. Existing ledger ACLs,
RPC grants and RLS remain unchanged. Local never requests the channel or secret. Missing private
configuration still blocks OpenAI dispatch. No credential, migration, live RPC, quota use, OpenAI
call or billing/deployment change was made. Validation uses mocked clients and fake HTTP only.

### Real AI Phase 3 — selective READ loop security

The current OpenAI adapter is tested only with injected mocks. Exactly ten existing read tools
are exposed; research, writes, arbitrary server execution and raw database access are absent.
Strict model-facing schemas supplement, never replace, original server Zod validation. Every
actual read authenticates and re-resolves the owned wedding through the existing executor.
Results pass existing output allowlists; Guest data stays aggregate and Task/private notes stay out.

The turn is bounded to four model rounds, six requested calls and one 30-second deadline, including
tool waits. SDK retries remain zero; exhausted/invalid turns fail safely with no raw SDK/DB error.
Duplicate call IDs fail closed. New IDs for identical validated arguments reuse a turn-local result
but still count against limits. Entire batches are validated before any execution. Timeout aborts
model requests and forbids subsequent launches; existing read promises may finish harmlessly.

History is read only after owned-thread verification and before inserting the current message.
The reader independently checks ownership. Its 8-message/2,000-per-message/10,000-total bounds
remain. Only quoted conversation text and omission metadata are sent; historical assistant rows
are never instructions, authorization or evidence. Local still bypasses history, OpenAI and quota.

Tool evidence and call/name/status metadata are generated from a server-only execution record.
An object-identity attestation checks exact claims before the Agent accepts them; model JSON,
history, cloned claims and mutated evidence cannot create that attestation. Fresh Marketplace
results may establish IDs outside eager Local context; an attested empty search needs no fake IDs.
No raw tool traces or hidden reasoning are returned/persisted. Optional encrypted reasoning
continuation remains opaque and ephemeral between Responses rounds with store:false.

Final text stays below persistence bounds (10,000 UTF-16 units); each response is capped at 1,200
output tokens. Safe aggregate usage is telemetry only. Research annotations, action proposals
and unknown output types are rejected. Instructions cannot guarantee arbitrary generated prose;
live grounding/prompt-injection evaluations remain required before claiming model quality.
The API change is only prior-history wiring. Guardrail policy/SQL, Auth, tools and RLS are unchanged.
No key, live admission, external API, billing or deployment was used in Phase 3.

### Real AI Phase 2 — isolated OpenAI provider foundation (historical snapshot)

Only the official OpenAI SDK was installed. Config/client/provider/instructions and selector import
`next/headers`, which Next rejects in Client Components. Secret names have no public prefix.
SDK construction is lazy, with zero retries, a 30-second timeout and logging off. Explicit OpenAI
selection without key/model fails closed. No live key or admission client is configured.
API/auth/ownership/guardrails are unchanged; Local requires no OpenAI or admission credentials.

One plain Responses call is capped at 1,200 output tokens; final text is at most 10,000 UTF-16 code
units without truncation. Only question/language are sent, with `store:false`; no database context,
tool registry or history is exported in Phase 2. Normalization discards reasoning/SDK metadata,
rejects tools/actions/research annotations and assigns only general-guidance provenance. Provider
failures return fixed safe non-retryable errors. Arbitrary prose needs later live evaluation;
mocked instruction tests do not prove model behavior.

Provider tests inject responses and block fetch/HTTP/HTTPS/socket connections, including api.openai.com.
No live quota, external model, research, billing or prepaid credit is used. Auto Reload must remain
OFF under the owner's later billing controls. Turn quotas are not a dollar guarantee.
