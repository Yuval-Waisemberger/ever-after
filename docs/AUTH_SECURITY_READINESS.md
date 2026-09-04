# Local Auth/Security readiness — 4 September 2026

This is a local implementation, not evidence that any remote project has been secured or configured.
No migration, seed, Auth-user creation, Supabase connection or SMTP operation was performed.

## Database role protection

New migration: `supabase/migrations/202609040001_profile_role_permissions.sql`.
It revokes the historical table-wide UPDATE grant on `public.profiles` from `authenticated`, then
grants UPDATE only on `display_name` and `phone`. An authenticated direct API/SQL request that
includes `role` is denied, for Couple→Vendor and Vendor→Couple alike. Existing own-row SELECT/UPDATE
RLS remains in force; legitimate field edits and the timestamp trigger remain compatible.
The security-definer `handle_new_user()` signup trigger is unchanged and initializes the initial
role and corresponding wedding/business record. No administrator system or role model was added.
Apply migrations chronologically to the fresh Frankfurt project later, with explicit approval.

Vitest checks the migration structure. `supabase/tests/profile-role-security.test.sql` contains eight
transactional pgTAP checks for both initial roles, denied role changes and successful ordinary edits.
That file creates test fixtures only when explicitly run in a disposable test database, then rolls
back. It was NOT executed. Real authorization enforcement remains pending database verification.

## Callback redirect boundary

`src/lib/auth/redirect.ts` accepts only nonempty relative paths beginning with exactly one slash.
It rejects absolute URLs, protocol-relative paths, backslashes, whitespace/control characters,
malformed percent encodings, values over 2,048 characters and unsafe nested encodings (bounded to
six decode passes). URL normalization also rejects double-slash path normalization. Query strings
and fragments are allowed when otherwise safe. The returned value remains the original relative
path. The parsing-only `internal.invalid` sentinel is not a deployment origin or destination.

The callback's invalid/missing `next` fallback is the stored role's destination: new Couple
`/wedding/setup`, existing Couple with skipped/completed setup `/wedding`, Vendor `/vendor`.
A safe explicit `next` can still override that default; existing destination guards remain intact.
Missing profile/wedding data goes to `/auth/verification?issue=profile`, never a guessed role.
Invalid/expired callbacks go to shared branded `/auth/verification` recovery. An optional validated
Couple/Vendor audience hint controls only recovery copy/links, never authorization or stored role.

## Signup, verification and resend

Both signup actions explicitly construct `emailRedirectTo` from `NEXT_PUBLIC_SITE_URL` and
`/auth/callback?audience=couple` or `?audience=vendor`. The configured value must be an HTTP(S)
origin without credentials, path, query or fragment. Missing/invalid configuration fails before
signup/resend calls the provider. No request Host/Origin header is trusted to select an email target.

- Confirm Email enabled: signup retains existing role metadata, returns user/no session, and shows
  a Check your email panel with the entered email retained for resend. It does not enter a workspace.
- Verification: Supabase verifies the token, redirects with a code, the existing SSR client exchanges
  that code using cookie-backed PKCE, and the callback reads the authenticated stored profile.
  New Couple goes to `/wedding/setup`; Vendor goes to `/vendor`.
- The installed SDK's optional `sb_flow_id` is forwarded to code exchange so per-flow verifiers work.
  The SDK validates that hint. It does not affect role selection.
- Confirm Email disabled: immediate-session signup keeps existing `/wedding/setup` or `/vendor`
  routing. There is no custom email-confirmed database field or alternate authentication system.
- Recognized `otp_expired` errors show an expired-link heading. Other/missing/used codes (including
  errors unavailable to the server in a URL fragment) show the shared invalid/expired recovery copy.
  Known audience gets its own login/signup links; unknown audience gets both choices.
- Resend calls only `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`.
  Success and account-specific 4xx failures share a generic response without revealing existence.
  Rate limiting and service/network failures show restrained retry feedback, not raw provider data.
- PKCE requires opening the newest link in the browser that requested it. A missing verifier or
  cross-browser attempt recovers through resend/login, rather than bypassing verification.

## Later configuration and connected acceptance checks

With approval, configure the Frankfurt public URL/publishable key locally (never in source), apply
the existing migrations plus the new security migration, and verify profile initialization/RLS.
Set `NEXT_PUBLIC_SITE_URL` per environment: local app origin now, actual HTTPS Vercel origin later,
then the custom domain origin if adopted. Next public variables are build-time configuration, so
rebuild when changing the deployment origin. Core Auth code does not need a hostname rewrite.

In Supabase Auth settings later:

1. Enable Email/Password and Confirm Email for the intended real flow.
2. Set Site URL and allow the corresponding callback URLs, including audience query variants and
   SDK flow hints if emitted. Use narrowly scoped callback allowlist patterns, not arbitrary hosts.
3. Keep the confirmation email link using Supabase's `ConfirmationURL` (or an equivalent documented
   redirect-aware template); a plain SiteURL link cannot complete PKCE. Test template and allowlist.
4. Configure sender/delivery limits and optional custom SMTP there, not in application code.
   Resend, Brevo or another SMTP provider requires no Auth rewrite. Domain ownership, sender DNS,
   HTTPS/app-domain routing and Supabase/Vercel URL configuration are later configuration tasks.

Connected acceptance still must cover two roles with real confirmation emails, no-session access
denial, verification/session cookies, setup/dashboard routing, used/expired/cross-browser links,
resend/throttling, profile initialization and direct API role-change denial with ordinary edits.
Test confirmation-disabled behavior only in a suitable development environment. No claim of real
email delivery, remote permission enforcement or deployed callback configuration is made here.

## Changed files (this task only)

- `.env.example` — clarify the existing public site-origin variable.
- `src/lib/actions/auth-state.ts` — verification email state.
- `src/lib/actions/auth.ts` — explicit callback URL, pending state, resend action.
- `src/lib/validation/auth.ts` — resend input schema.
- `src/lib/auth/redirect.ts` — internal redirect and configured callback helpers.
- `src/app/auth/callback/route.ts` — safe role-aware PKCE success/recovery routing.
- `src/app/auth/verification/page.tsx` — shared public recovery page.
- `src/components/auth/auth-panel.tsx` — switch pending signup to verification panel.
- `src/components/auth/verification-panel.tsx` — branded pending/error/resend UI.
- `supabase/migrations/202609040001_profile_role_permissions.sql` — new permission migration.
- `supabase/tests/profile-role-security.test.sql` — deferred real database regression tests.
- `tests/auth/redirect.test.ts`, `tests/auth/flows.test.ts`, `tests/auth/role-security.test.ts` — local regression tests.
- `e2e/auth-verification.spec.ts` — browser recovery/viewport tests.
- `e2e/visual-consistency.spec.ts` — update the obsolete callback failure expectation.
- `docs/SECURITY.md`, `docs/AUTH_SECURITY_READINESS.md` — mechanism, limitations and handoff.

No marketplace data/images, approved shared styles, protected-route guards, historical migrations,
business formulas, Supabase configuration files or `.env.local` were changed by this task.

## Local validation results

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Passed |
| ESLint | Passed |
| Vitest | 105 passed across 14 files; Auth provider interactions mocked, no network |
| Relevant Playwright | 8 passed: auth-verification and visual-consistency suites |
| Production build | Passed using `next build --webpack` |
| New database permission tests | Added, not executed; require an approved test database |

Vitest initially hit a Windows sandbox/esbuild configuration-read error; the identical local suite
passed with filesystem escalation. This was an environment startup failure, not a failing assertion.
The Webpack build path was used for this environment; default Turbopack was not rerun in this task.
Playwright used a temporary local production server on port 3101, now stopped. The user's server on
port 3000 was left untouched. Browser tests made no real signup/resend request to Supabase.

Browser coverage: all four Couple/Vendor signup/login views; neutral and audience-aware expired/
invalid verification recovery; unresolved-profile recovery; not-found; mobile marketplace/profile;
and redirects from all existing Couple/Vendor protected routes while disconnected.
Recovery viewports: 1440×900, 390×844, 360×800. Existing regression coverage also used 320×844,
390×844 and 768×844. No horizontal overflow was found. Desktop and 390px screenshots were visually
inspected; no shared-style changes were needed.

Representative screenshots (ignored local test output):

- `test-results/auth-verification-verifica-7ad34-ut-changing-the-auth-design-chromium/verification-1440.png`
- `test-results/auth-verification-verifica-7ad34-ut-changing-the-auth-design-chromium/verification-390.png`
- `test-results/auth-verification-verifica-7ad34-ut-changing-the-auth-design-chromium/verification-360.png`

Final Git state: `main`, ahead of `origin/main` by one pre-existing commit; 51 modified tracked files,
434 deleted tracked files, 258 untracked files (counted individually), nothing staged. Baseline was
46 modified, 434 deleted, 248 untracked. The large pre-existing image/design worktree was preserved;
none of the 434 deletions were performed by this Auth task. The task adds ten files and modifies
eight existing files, three of which were already modified/untracked at baseline.

No Supabase connection/link, migration execution, seed execution, Auth-user creation, remote Storage
mutation, staging, commit, push, deployment or paid service occurred. No unrelated cleanup followed.
