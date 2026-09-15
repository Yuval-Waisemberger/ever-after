# Ever After — Basic Security

## 1. Purpose and security model

Ever After protects private wedding, financial, guest, Vendor-management and Assistant information
while allowing visitors to browse deliberately public Vendor content. Security uses several layers:
Supabase Auth, server-side role and ownership checks, PostgreSQL Row Level Security (RLS), restricted
database grants, integrity constraints, validated inputs and minimal outputs.

The access contexts are anonymous visitor, Couple and Vendor. A hidden page or button is never an
authorization mechanism. Requests must remain unauthorized even if a user bypasses the interface or
knows another row's UUID.

## 2. Authentication

Supabase Auth provides email/password authentication, password hashing, sessions, account-confirmation
tokens and password-recovery tokens. The application does not implement its own credential store.

The Next.js server obtains the current identity from Supabase for protected pages, Server Actions and
Route Handlers. It does not trust a browser flag, displayed name or submitted user ID. Session-refresh
middleware supports continuity, but protected operations still perform their own checks.

The two authenticated roles are:

- **Couple:** one shared login for both partners and one wedding workspace.
- **Vendor:** an owner managing their own Vendor business.

The primary email is the authentication identity. Phone numbers and the optional secondary email are
contact details only. Password confirmation is validated during signup but not stored separately.

Supabase and the configured Custom SMTP service handle confirmation and recovery email delivery.
Confirmation, recovery-link processing, password update, logout and login with the new password were
manually validated. SMTP credentials, passwords and recovery tokens remain outside the repository
and must never be displayed or logged.

Token-hash confirmation is deliberately prefetch-safe. The email link opens `/auth/confirm`, whose
initial `GET`/`HEAD` validates and renders the request without calling `verifyOtp()` or otherwise
consuming the one-time token. Verification occurs only through an explicit Server Action submission.
The action checks an existing valid session first, verifies at most once when necessary, and then uses
a fresh server client to confirm the cookie-backed session before navigation. Email confirmation
resolves the stored application profile and ignores URL-supplied roles or destinations; recovery can
continue only to `/auth/reset-password` before the password is changed. This prevents ordinary link
previews and `GET`-only email scanners from consuming the token on page load while keeping invalid,
expired, temporary-provider, profile-integrity, and session failures in controlled states.

## 3. Authorization and permissions

Server code verifies the stored role and resolves the owned wedding or Vendor. The database then
enforces row ownership through RLS. Client-supplied ownership identifiers cannot grant access.

| Resource or action | Visitor | Couple | Vendor |
| --- | --- | --- | --- |
| Public pages, taxonomy and published Vendors | Read | Read | Read |
| Approved public reviews | Read | Read | Read |
| Wedding Details, Tasks and Guests | None | Own wedding | None |
| Saved/booked Vendors and private notes | None | Own wedding | None |
| Budget and payments | None | Own wedding | None |
| Couple reviews | None | Create/update own as permitted | Public read only |
| Assistant conversations | None | Own wedding | None |
| Vendor profile and media management | None | None | Own Vendor only |

All private public-schema tables enable RLS. Database grants first restrict the operations a role may
attempt, and policies then restrict eligible rows. Security-definer ownership helpers use a fixed
empty search path and explicit schema names.

Authentication is required for every planning or management mutation: Wedding Details, Tasks,
Guest List, Vendor relationships, External Vendors, Budget, payments, reviews, Assistant history,
account settings and Vendor media. Anonymous users are limited to intentionally public experiences.

## 4. Preventing cross-user access

Couple data is partitioned by wedding. Each protected operation obtains the authenticated Couple's
wedding server-side and combines the target ID with that wedding ID. Knowing another Couple's record
ID is therefore insufficient to read, update or delete it.

Vendor management is partitioned by Vendor ownership. A Vendor cannot manage another Vendor or any
Couple workspace. A Couple cannot create an owned Vendor profile, and a Vendor cannot create an owned
wedding. Role-hardening policies apply these rules even to malformed or legacy parent records.

Relationship inserts can reference only a published marketplace Vendor or an External Vendor owned
by the same wedding. This prevents forged unpublished identifiers from exposing private business data
through the booking-to-budget flow.

Restrictive foreign keys preserve Couple-owned reviews, relationships and financial history. A Vendor
cannot delete its parent profile to erase a Couple's records. Missing and unauthorized targets return
safe failures where appropriate, reducing identifier discovery.

## 5. Input validation and integrity

Client validation improves usability, but server validation is authoritative. Shared Zod schemas
reject missing, malformed, unknown and oversized values before a mutation.

Validated areas include registration, Wedding Details, Task status and dates, Guest counts and RSVP,
contact fields, Vendor URLs/categories/prices/capacity, review ratings, money values, payment schedules,
UUIDs, Assistant requests and media type/size.

PostgreSQL repeats critical rules through constraints, foreign keys, uniqueness and triggers. The
booking-to-budget relationship has one canonical linked item; ordinary Budget edits cannot reassign
its source, ownership or commitment. Payment inserts and increases lock the parent item before totals
are checked, preventing concurrent requests from jointly exceeding the permitted commitment. Failed
validation or trigger execution rolls back the related mutation.

Supabase's query builder parameterizes requests rather than concatenating raw SQL. Search text is
length-limited and unsafe PostgREST-filter punctuation is removed. React escapes normal text, no
user-provided raw HTML is rendered, and Assistant Markdown excludes raw HTML/images and restricts
links to safe protocols.

## 6. Protected Server Actions and APIs

A protected Server Action or Route Handler must:

1. obtain the current Supabase user;
2. check the required Couple or Vendor role;
3. resolve ownership on the server;
4. validate an allowlisted request schema;
5. execute a row-scoped operation;
6. return a controlled result without raw internal errors.

The Assistant API repeats authentication, Couple role, wedding ownership and thread ownership. It
does not treat model text, conversation history or client-provided IDs as authorization. Unknown
tools, malformed JSON, forged evidence and invalid identifiers fail closed.

Ambiguous writes are not replayed automatically, because a blind retry could duplicate data. There
is no public arbitrary-SQL endpoint, generic table selector, unrestricted RPC endpoint or browser
access to the service-role client.

## 7. Secrets and media storage

Real secrets are kept outside Git:

- `.env.local` is ignored and example files contain placeholders only;
- Vercel secrets are stored in Project Settings;
- Supabase Auth and SMTP secrets remain in Supabase configuration;
- OpenAI and service-role keys are server-only and never use `NEXT_PUBLIC_`;
- passwords, App Passwords, recovery tokens and private connection strings are excluded from code,
  documentation, screenshots and logs.

The Supabase URL and browser publishable/anonymous key are public by design; RLS and the user's JWT
provide data protection. The powerful service-role key is confined to a narrow server-only Assistant
admission adapter and is not used as a general application data client.

Couple media is private and ownership-path restricted. Vendor marketing media is intentionally public
so published profiles can display images. Uploads are limited to the owning Vendor namespace,
supported image types and 5 MB. A known public Vendor object URL may remain reachable even after
unpublishing, so private documents must never be stored in that bucket.

## 8. Wedding Assistant security

The Assistant adds stricter controls because model input and history are untrusted:

- wedding-only scope;
- ten authenticated internal READ tools and two narrow research tools;
- no product WRITE tools;
- fresh owned-wedding resolution for every internal read;
- strict input/output schemas and explicit field allowlists;
- server-attested evidence that model text cannot create;
- bounded, untrusted conversation history;
- four model rounds, six custom calls and no fourth-round tool execution;
- one research request/search, a 30-second deadline and zero automatic retries;
- 500 global and 150 per-Couple admitted turns, with one active request per Couple;
- safe response lengths and privacy-minimized diagnostics.

Guest information supplied to the Assistant contains five aggregate counts only—not names, contact
details, dietary requirements or private notes. Task notes, private Vendor notes, account IDs and Auth
metadata are also excluded from normal Assistant evidence.

Research uses a separate executor and receives no database client, raw history, user identity or
private notes. Context is minimized, sources require safe HTTPS/provenance checks, and insufficient
evidence returns a limited result rather than invented certainty. Diagnostics omit prompts, history,
tool payloads, financial values, guest details, raw provider errors, headers and credentials.

## 9. Security verification performed

Security claims were tested at database, application, browser and Assistant layers.

### Database and authorization

A disposable PostgreSQL 17 runner executed the actual migrations using synthetic anonymous, Couple
and Vendor identities. It checked owner access, Couple A/B and Vendor A/B isolation, wrong-role parent
creation, forged IDs, unpublished-Vendor disclosure, role immutability, canonical financial history,
payment concurrency/rollback and media namespaces.

The security runner passed 179 assertions, including a failed-transaction rollback. The database and
volume were removed afterward; no production credentials or live records were used. The RLS SQL
specification retained 45 catalog/policy assertions. Native pgTAP was unavailable in the plain image,
so those assertions were checked directly rather than misreported as a native pgTAP run.

### Application and browser boundaries

Application tests covered real role/owned-parent logic for Setup, Wedding Details, Guests, Vendor
relationships, External Vendors, Budget, payments, media and Assistant access. Guest mutations verify
that missing or forged IDs cannot report success.

Twelve isolated production-browser checks passed for anonymous protected-route redirects and forged
Assistant requests. The wider repository checkpoint passed 762 Vitest and 107 Playwright tests;
these totals include functional/UI tests and are not presented as security-only tests.

### Assistant guardrails

Final Assistant validation included 632 Assistant tests, 68 guardrail tests, 3,442 disposable
PostgreSQL admission assertions, 17 UI component tests and 22 browser regressions. Tests covered
privacy, history, tool bounds, evidence, safe errors, deadlines, concurrent quota claims, 500/501 and
150/151 boundaries, one-active-request enforcement and browser denial of privileged admission RPCs.
Offline provider tests blocked external network access. Mocked tests prove application controls and
plumbing, not perfect future model behavior.

### Live configuration checks

Post-deployment inspection confirmed the applied role policies, ownership helpers, restrictive
foreign keys and RLS state. Security hardening changed definitions without changing existing row
counts or data fingerprints. Authenticated Couple routes and anonymous public/private routing were
smoke-tested without creating security-test records. Account confirmation and password recovery were
also manually verified through Supabase Auth and Custom SMTP.

## 10. Remaining risks and future improvements

| Remaining limitation | Future improvement |
| --- | --- |
| Isolated SQL identities do not reproduce every hosted Supabase JWT/PostgREST path | Run multi-user adversarial tests in a safe staging project |
| Storage namespace policies lack complete hosted HTTP upload/delete verification | Add Storage integration tests, including signed URLs |
| Public Vendor URLs may remain reachable | Use private drafts and controlled publication if needed |
| No additional app-wide login or general mutation rate limiter | Add measured IP/account/endpoint limits and alerts |
| No fully tuned project-specific Content Security Policy | Add and test CSP/security headers for approved origins |
| Uploads lack a dedicated decode/malware pipeline | Decode, resize and scan images server-side |
| No scoped administrative/support role | Add least-privilege audited administration only if required |
| Not every sensitive mutation has a durable audit record | Add minimal retention-aware audit logging |
| MFA and breached-password checking are not product features | Add stronger account controls for real customers |
| Dependency review is not fully automated | Add controlled vulnerability scanning and updates |
| Evidence controls do not prove every AI sentence | Continue approved live factual and prompt-injection evaluations |

## 11. Conclusion

Ever After's central security boundary is verified identity plus server-resolved role and ownership,
reinforced by PostgreSQL RLS, restricted grants and integrity constraints. Server validation, safe
rendering, protected APIs, isolated secrets, scoped media and a read-only bounded Assistant provide
additional defense.

The project has meaningful evidence for its main authorization and privacy claims. The remaining
hosted JWT/Storage adversarial tests, security headers, abuse controls, upload processing and
operational monitoring are documented as future production work rather than hidden limitations.
