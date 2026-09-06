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

- Add rate limiting for auth, reviews, search, uploads, and Assistant endpoints at production scale.
- Add malware/image decoding checks and server-side resizing for uploaded media.
- Add security headers/CSP tuned to Supabase and approved image domains.
- Add audit records for sensitive mutations and confirmed Assistant actions.
- Add breached-password/MFA options if the product moves beyond an academic MVP.
- Run automated dependency/security updates and review Supabase advisories.
- Verify all RLS cases with real test identities after migrations are applied.
- Use short-lived, hashed, revocable, field-allowlisted tokens if Wedding Helper is implemented.

## Security verification checklist

Before deployment, use at least two Couple accounts, two Vendor accounts, and an anonymous session.
Attempt cross-wedding reads/writes, cross-vendor profile edits, Vendor review edits, unpublished vendor
reads, forged ownership IDs, excessive payment totals, invalid ratings, oversized uploads, and direct
access to every protected route. Record the results in the test report; do not infer RLS success from
the UI alone.
