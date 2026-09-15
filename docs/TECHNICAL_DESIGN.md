# Ever After — Detailed Technical Design

**Status:** Aligned with the implemented application
**Application type:** Responsive full-stack wedding-planning web application
**Primary stack:** Next.js App Router, React, TypeScript, Supabase, PostgreSQL, and Vercel
**Related documents:** `PRD.md`, `ARCHITECTURE.md`, `SECURITY.md`, `SCALE.md`, `TESTING.md`, and the separate AI design document

This document describes how the Ever After product is organized and how its main features are designed at the implementation level. It covers the concrete project structure, components, data model, CRUD operations, application interfaces, business rules, state, error handling, validation, and user experience required by the course.

High-level deployment architecture belongs in `ARCHITECTURE.md`. Security analysis, scalability analysis, test strategy, and the internal AI-agent design are documented separately. This document includes only the technical boundaries from those areas that are necessary to explain how the application works.

---

## 1. Project Folder Structure

The application follows a feature-oriented structure inside a Next.js App Router project. The tree below presents the main runtime directories and groups related files rather than listing every stylesheet, test fixture, or generated asset.

```text
wedding-planner-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # Root document and shared styles
│   │   ├── page.tsx                         # Public landing page / signed-in redirect
│   │   ├── globals.css                      # Global tokens and base styles
│   │   ├── (couple)/
│   │   │   ├── layout.tsx                   # Protected Couple shell
│   │   │   ├── wedding/
│   │   │   │   ├── page.tsx                # Our Wedding dashboard
│   │   │   │   ├── details/page.tsx        # Wedding Details
│   │   │   │   ├── setup/page.tsx          # Optional setup wizard
│   │   │   │   └── timeline/page.tsx       # Task-derived Timeline
│   │   │   ├── tasks/page.tsx
│   │   │   ├── guests/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── vendors/my/page.tsx          # Saved and managed vendors
│   │   │   ├── reviews/page.tsx
│   │   │   ├── assistant/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── (vendor)/
│   │   │   ├── layout.tsx                   # Protected Vendor shell
│   │   │   └── vendor/
│   │   │       ├── page.tsx                # Vendor dashboard
│   │   │       ├── profile/page.tsx        # Business profile and gallery
│   │   │       ├── explore/page.tsx        # Redirect to public marketplace
│   │   │       └── settings/page.tsx
│   │   ├── auth/
│   │   │   ├── couple/page.tsx             # Couple login and registration
│   │   │   ├── vendor/page.tsx             # Vendor login and registration
│   │   │   ├── callback/route.ts            # Authentication code exchange
│   │   │   ├── confirm/page.tsx             # Non-mutating token confirmation page
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── verification/page.tsx
│   │   ├── vendors/
│   │   │   ├── page.tsx                    # Public marketplace
│   │   │   └── [slug]/page.tsx             # Public vendor profile
│   │   └── api/
│   │       └── assistant/route.ts           # Assistant HTTP boundary
│   ├── components/
│   │   ├── assistant/                       # Chat, messages, history, composer
│   │   ├── auth/                            # Auth forms and recovery presentation
│   │   ├── budget/                          # Metrics, expenses, payment controls
│   │   ├── guests/                          # Summary, list, guest forms
│   │   ├── layout/                          # Public header and authenticated shells
│   │   ├── planning/                        # Shared reveals and animated values
│   │   ├── reviews/                         # Review forms and cards
│   │   ├── tasks/                           # Task form, rows, filters, quick actions
│   │   ├── ui/                              # Reusable fields, buttons, status and feedback
│   │   ├── vendor/                          # Vendor dashboard, profile, gallery
│   │   ├── vendors/                         # Marketplace cards, filters and relationships
│   │   └── wedding/                         # Dashboard, setup, details, countdown, timeline
│   ├── generated/
│   │   └── marketplace-demo.json            # Generated local marketplace fallback
│   ├── lib/
│   │   ├── actions/                         # Server Actions grouped by feature
│   │   ├── assistant/                       # Server-only Assistant orchestration and tools
│   │   ├── auth/                            # Current-user and role helpers
│   │   ├── domain/                          # Pure business calculations and state rules
│   │   ├── queries/                         # Server-side, ownership-scoped reads
│   │   ├── supabase/                        # Browser, server and proxy clients
│   │   ├── validation/                      # Zod request and form schemas
│   │   └── vendors/                         # Marketplace types, mapping and search helpers
│   └── proxy.ts                              # Supabase session-cookie refresh
├── public/
│   ├── brand/                                # Logo assets
│   ├── images/                               # Landing and authentication imagery
│   └── demo-marketplace/                     # Checked-in optimized vendor WebP assets
├── supabase/
│   ├── migrations/                           # Ordered PostgreSQL schema migrations
│   └── seed.sql                              # Reproducible synthetic demo content
├── scripts/                                  # Dataset generation and maintenance utilities
├── tests/                                    # Unit, domain, application and component tests
├── e2e/                                      # Browser specifications and isolated fixtures
├── package.json
├── tsconfig.json
└── README.md
```

### 1.1 Folder Responsibilities

- `src/app` owns routes, layouts, loading/error boundaries, and the composition of each page.
- `src/components` owns reusable presentation and interaction components. Business calculations do not belong in these components.
- `src/lib/queries` performs server-side reads. Queries return only the data required by their feature.
- `src/lib/actions` performs validated application mutations through Server Actions.
- `src/lib/domain` contains pure business rules such as recommendation scoring, budget calculations, task timing, and wedding-date phases.
- `src/lib/validation` contains shared Zod schemas used at server boundaries.
- `src/lib/supabase` creates the correct Supabase client for browser, server, and session-refresh contexts.
- `supabase/migrations` is the authoritative, ordered history of durable database changes.
- `public` contains runtime assets only. Design references and temporary review material are not imported by the application.

---

## 2. Structure of the Main Components

Pages are Server Components by default. They authenticate the current user when required, execute scoped queries, and pass serializable data to feature components. Client Components are used only where browser interaction is necessary, such as forms, menus, filters, chat state, upload progress, animations, and wizard navigation.

| Component area | Main components | Responsibility |
| --- | --- | --- |
| Layout | `AppShell`, `PublicHeader`, `PublicMobileMenu`, `PageHeader`, `PageTransition`, `PageLoading` | Provide public navigation, role-aware authenticated navigation, responsive menus, page framing, and real loading states. |
| Shared UI | `FormField`, `ChoiceGrid`, `SubmitButton`, `LinkButton`, `StatusPill`, feedback and empty-state primitives | Keep form labels, controls, focus behavior, button states, statuses, and success/error feedback consistent. |
| Authentication | `AuthPanel`, `RecoveryPage`, Couple and Vendor forms | Present login, registration, verification, forgot-password, and reset-password flows while delegating mutations to authentication actions. |
| Wedding | `WeddingDetailsForm`, `SetupWizard`, `WeddingDateCountdown`, `TimelinePath`, dashboard cards | Maintain editable Wedding Details, guide optional setup, present the date phase, and display summaries derived from other feature data. |
| Planning | `PlanningReveal`, `AnimatedValue` | Provide reusable, reduced-motion-aware reveals and value transitions without owning domain data. |
| Tasks | `TaskForm`, `TaskListPanel`, `TaskRow`, filter and quick-action controls | Create and edit tasks, filter them, and submit status or delete actions with pending and error feedback. |
| Marketplace | `VendorFiltersForm`, `VendorCard`, vendor detail/gallery components, save and relationship controls | Read URL filters, display public vendor data, show recommendation reasons, and allow authenticated Couples to manage a relationship. |
| Setup booking | Vendor typeahead and setup-booking controls | Search a small public candidate set, select a vendor, create an external vendor, or postpone vendor details without changing unrelated Wedding Details. |
| Budget | `BudgetMetrics`, `BudgetExpenseSurface`, expense and payment forms | Present calculated totals and manage manual expenses, canonical booked-vendor commitments, and payment records. |
| Guests | `GuestSummary`, `GuestList`, guest forms | Present aggregate counts and support guest or household record management. |
| Reviews | Review form, rating controls, review cards, `VendorReveal` | Allow Couples to manage their own reviews and present approved public reviews and Vendor read-only feedback. |
| Assistant | `AssistantChat`, `MessageContent`, thread/history controls, composer | Manage one conversation UI, bilingual direction, safe Markdown output, pending state, source labels, and thread selection. |
| Vendor account | `VendorDashboardView`, `VendorProfileForm`, gallery controls | Show profile completion and reviews, edit the owned business profile, publish it, and manage its images. |

### 2.1 Component Data Flow

1. A route-level Server Component identifies the current public, Couple, or Vendor context.
2. The route calls one or more feature queries.
3. Query results are mapped into typed view models rather than passed to the UI as unrestricted database rows.
4. The page composes feature components and supplies their initial values.
5. A Client Component submits a form or action request.
6. The server validates the request, resolves ownership again, performs the mutation, and returns a typed result.
7. Relevant routes are revalidated so that refreshed Server Components read the new source-of-truth data.

This structure prevents presentation components from becoming an alternative data layer.

---

## 3. Database Structure

Supabase Auth owns authenticated identities. PostgreSQL tables under the public application schema store product data. UUID primary keys identify records, foreign keys express ownership, and timestamps record creation and modification. Money is stored as integer minor units (agorot) rather than floating-point values. Calendar facts use date-only values; audit events use timestamps.

### 3.1 Ownership and Relationships

```text
auth.users
└── profiles
    ├── weddings (Couple role)
    │   ├── tasks
    │   ├── guests
    │   ├── external_vendors
    │   ├── couple_vendors ── vendor_profiles or external_vendors
    │   ├── budget_items
    │   │   └── payments
    │   ├── reviews ── vendor_profiles
    │   └── assistant_threads
    │       └── assistant_messages
    └── vendor_profiles (Vendor role)
        ├── vendor_images
        └── received reviews

vendor_categories
└── vendor_subcategories
    └── vendor_profiles
```

### 3.2 Main Tables

The key-data column lists the fields that define each table's responsibility; it is not intended to repeat every audit or presentation column.

| Table | Purpose and key data | Main relationships |
| --- | --- | --- |
| `profiles` | Application identity, stored role, display/account information, and user preferences required outside Supabase Auth. | One row per `auth.users` identity; parent of either a Couple wedding or an owned Vendor profile. |
| `weddings` | Wedding date, area, event type, guest estimate, total budget, styles, priorities, venue/setup declarations, and setup status. | Owned by one Couple profile; ownership root for private planning data. |
| `tasks` | Title, category, notes, due date, priority, and workflow status: `open`, `in_progress`, `waiting_on_vendor`, or `completed`. | Belongs to one wedding. |
| `guests` | Guest or household information, invitation/RSVP-related values, and attendance counts. | Belongs to one wedding. |
| `vendor_categories` | Stable category name, slug, and display order. | Parent of subcategories and referenced by vendor profiles. |
| `vendor_subcategories` | Stable subcategory name, slug, parent category, and display order. | Belongs to one category and is referenced by vendor profiles. |
| `vendor_profiles` | Owner, slug, business name, description, category, subcategory, location mode, physical/service areas, services, styles, event types, price range, capacity range, Friday availability, public contact/social fields, and publication status. | Optionally owned by a Vendor profile; referenced by images, Couple relationships, and reviews. |
| `vendor_images` | Storage path or checked public URL, alternative text, sort order, and primary-image flag. | Belongs to one vendor profile. Exactly one image source is stored per row. |
| `external_vendors` | A Couple's private record for a business not present in the public marketplace, including name, service classification, and optional contact information. | Belongs to one wedding; may be referenced by one Couple-vendor relationship. |
| `couple_vendors` | Saved flag, lifecycle status, agreed price, private notes, and either a marketplace Vendor ID or an External Vendor ID. | Joins one wedding to exactly one vendor identity. |
| `reviews` | Reviewer display information, rating dimensions, recommendation flag, review text, public/seed status, and timestamps. | A non-seed review belongs to one wedding author and one marketplace Vendor. |
| `budget_items` | Label, category, source, optional relationship link, estimate, active commitment, notes, and timestamps. | Belongs to one wedding; parent of payments. Canonical booked-vendor items link to `couple_vendors`. |
| `payments` | Amount, due date, paid status, paid date, and notes. | Belongs to one budget item. |
| `assistant_threads` | Conversation identity, title/summary metadata, and timestamps. | Belongs to one wedding. |
| `assistant_messages` | Message role, text, source/evidence labels, and creation time. | Belongs to one Assistant thread. |

### 3.3 Important Database Constraints

- One application profile exists per authenticated user.
- One wedding exists per Couple owner; one owned vendor profile exists per Vendor owner.
- A Couple-vendor relationship targets either a marketplace Vendor or an External Vendor, never both.
- A wedding cannot have duplicate relationships to the same vendor identity, but it may book multiple vendors in the same category.
- Ratings remain within 1–5. Counts and monetary values reject invalid negative values where the domain does not permit them.
- Minimum price/capacity cannot exceed maximum price/capacity.
- A Vendor image has one source: either a storage path or an external public URL.
- A canonical booked-vendor budget item is unique for its relationship.
- Payment obligations cannot exceed the active positive commitment when a new payment or increase is created.
- Foreign keys and database rules prevent protected financial history from being silently removed through vendor relationship deletion.

---

## 4. Main CRUD Operations

All private CRUD operations resolve the current user and owned parent record on the server. Client-supplied owner or wedding identifiers are not treated as authorization.

| Resource | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Account/profile | Created during role-specific signup. | Current user reads their own account context. | User updates permitted account fields and preferences. | No ordinary hard-delete flow is exposed in the MVP. |
| Wedding Details | Created automatically for a new Couple. | Couple reads its own wedding throughout the workspace. | Couple saves or clears permitted Wedding Details and setup status. | No ordinary hard-delete flow is exposed. |
| Tasks | Couple creates a task. | Couple reads its own list, dashboard summary, and Timeline projection. | Couple edits fields or changes workflow status. | Couple deletes an owned task. |
| Guests | Couple creates a guest/household record. | Couple reads the owned list and aggregate summary. | Couple updates attendance and record details. | Couple removes an owned record. |
| Marketplace taxonomy | Created by controlled seed/migration data. | Public and authenticated users read categories and subcategories. | Not edited through the ordinary UI. | Not deleted through the ordinary UI. |
| Vendor profile | Created for a Vendor account or by controlled demo data. | Public users read published fields; owner reads management fields. | Vendor owner edits only the owned profile and publication settings. | No ordinary profile hard-delete flow is exposed. |
| Vendor images | Vendor owner uploads/adds owned image metadata. | Published images are public; management data is owner-scoped. | Owner updates permitted metadata/order/primary selection. | Owner removes an owned image. |
| Couple-vendor relationship | Couple saves or creates a relationship. | Couple reads its own saved and lifecycle states. | Couple changes saved flag, status, agreed price, and private notes. | Only a safely removable relationship without protected linked history can be deleted. |
| External Vendor | Couple creates a private vendor record. | Couple reads only its own external vendors. | Couple edits permitted details through the relationship workflow. | Deletion is rejected when protected links or financial history exist. |
| Review | Couple creates one owned review for a vendor. | Approved information is public; Couple reads its own review; Vendor reads received feedback. | Authoring Couple updates its own review. | Authoring Couple deletes its own review when permitted. Vendor cannot mutate it. |
| Manual budget item | Couple creates an independent expense. | Couple reads items and calculated totals. | Couple edits permitted label, category, notes, estimate, and commitment fields. | Couple deletes an unprotected manual item; items with payments are protected. |
| Canonical booked-vendor item | Created automatically when a booked relationship has an agreed price. | Couple reads it in Budget and summaries. | Relationship changes synchronize its active commitment; ordinary Budget editing cannot detach or reclassify it. | It is retained to preserve identity and payment history. |
| Payment | Couple creates a schedule/payment entry. | Couple reads payment history and upcoming obligations. | Couple edits amount, dates, notes, and paid status within validation rules. | Couple may explicitly delete a payment as a correction. |
| Assistant thread/message | Created when a Couple starts or continues a conversation. | Couple reads only threads and messages belonging to its wedding. | Conversation metadata may be updated by the controlled Assistant flow; messages themselves are not arbitrary editable records. | No general message-deletion operation is required for the current chat flow. |

### 4.1 Mutation Pattern

Every mutation follows the same sequence:

1. Parse submitted values into a plain input object.
2. Validate shape, length, type, enum, date, URL, and numeric rules with the appropriate Zod schema.
3. Authenticate the user and verify the required Couple or Vendor role.
4. Resolve the owned `wedding` or `vendor_profile` on the server.
5. Run the scoped insert, update, or delete.
6. Inspect database errors and affected/returned rows; zero affected rows are not reported as success.
7. Return safe field-level or form-level feedback.
8. Revalidate only the pages that consume the changed information.

---

## 5. API Description

Ever After does not add a redundant public REST API for ordinary internal forms. Next.js Server Actions handle authenticated application mutations, while Route Handlers are reserved for flows where an HTTP boundary is appropriate.

### 5.1 Route Handlers

| Interface | Method and authentication | Input | Processing and result |
| --- | --- | --- | --- |
| `/auth/callback` | `GET`; public entry with authentication-provider parameters | PKCE authorization code and safe redirect context | Exchanges the code for the Supabase session, determines the destination, and redirects. Invalid or missing codes return a safe authentication outcome. |
| `/api/assistant` | `POST`; authenticated Couple only | Validated JSON containing the user message and optional conversation/language context | Verifies the Couple, loads only permitted context, runs the bounded Assistant flow, stores owned messages, and returns response text, thread identity, and source labels. |

`GET /auth/confirm` is a public render-only page, not a mutating Route Handler. It accepts only a non-empty bounded `token_hash` with `type=email` or `type=recovery`, renders one explicit confirmation control, and performs no Supabase Auth mutation during page loading, previewing, or prefetching. The bound `confirmEmailToken` Server Action checks an existing valid session first, calls `verifyOtp()` no more than once when verification is required, and then uses a fresh server client to confirm that the session persisted through the cookie handoff. Email confirmation resolves the stored application profile before redirecting to `/wedding` or `/vendor`; recovery can continue only to `/auth/reset-password`. URL-supplied role and destination values are ignored.

Expected Assistant endpoint outcomes include:

- `400` for malformed, empty, overlong, or out-of-scope input.
- `401` when no valid session exists.
- `403` when the authenticated role is not permitted.
- `429` when an approved usage limit has been reached.
- `503` when the selected AI or research service is unavailable.
- `500` for an unexpected server failure, returned without raw database/provider details.

The detailed provider loop, internal read tools, research rules, usage controls, and evidence receipts belong in the separate AI design document.

### 5.2 Server Action Groups

| Action group | Main responsibilities |
| --- | --- |
| Authentication | Couple/Vendor signup, login, logout, explicit token-hash confirmation, forgot-password request, password update, and account-setting mutations. |
| Wedding | Save Wedding Details, save or skip Setup, and maintain optional booking declarations. |
| Tasks | Save a task, update status, and delete an owned task. |
| Guests | Create, update, and delete owned guest/household records. |
| Vendor relationships | Save/un-save a vendor, set lifecycle status, store agreed price/notes, and create/manage External Vendors. |
| Reviews | Create, edit, and delete a Couple-authored review. |
| Budget and payments | Create/update/delete permitted manual expenses and payment records. Canonical booking commitments are not written directly by the UI. |
| Vendor account | Update the owned business profile, change publication status, and register/remove gallery metadata. |

### 5.3 Storage Interface

Vendor image bytes upload to the configured Supabase Storage bucket using the authenticated Vendor session. File type and size are validated before metadata is accepted. The application stores only the controlled storage path and image metadata in `vendor_images`; public URLs are derived for published content. Demo marketplace images are checked-in local WebP files and do not use this upload flow.

---

## 6. Main Business Logic

### 6.1 Single Sources of Truth

- Wedding Details owns wedding facts and preferences.
- Tasks owns planning work. Timeline is a derived presentation of dated Tasks and does not store duplicate timeline records.
- Couple Vendors owns saved/lifecycle status, agreed prices, and private vendor notes.
- Budget owns expenses and payments. Our Wedding only summarizes calculated financial information.
- Reviews are authored in the Couple review area and displayed on the relevant Vendor profile.
- Dashboard cards and Assistant answers consume authoritative records rather than maintaining parallel copies.

### 6.2 Recommendation Calculation

Recommendations are deterministic and explainable; they are not described as AI-generated. The calculation evaluates only dimensions for which both wedding and Vendor evidence are available:

| Dimension | Weight |
| --- | ---: |
| Service area | 25 |
| Available-budget compatibility | 20 |
| Style overlap | 20 |
| Guest capacity | 15 |
| Event type | 10 |
| Rating quality | 10 |

The normalized score is:

`score = earned weight / available weight × 100`

Missing dimensions are removed from the denominator. A Vendor receives the **Recommended for you** badge only when the score is at least 75 and at least two substantive dimensions other than rating are available. The strongest positive dimensions are returned as human-readable reasons. Vendors that do not qualify remain visible in results.

### 6.3 Marketplace Filtering

Marketplace state is expressed through URL parameters. Search covers business name, city, and description. Additional filters cover category, subcategory, area, price, rating, guest capacity, Friday availability, and offered service. Published database records are the connected source of truth. A generated synthetic fallback supports a useful public preview when Supabase is not configured locally, without pretending that private features work.

The synthetic marketplace source generates both `supabase/seed.sql` and
`src/generated/marketplace-demo.json`. Connected environments read published Vendor records from
Supabase, while the generated JSON provides the disconnected public preview. `pnpm seed:check`
verifies that the generated dataset and its tracked image references remain consistent.

### 6.4 Vendor Lifecycle and Booking

`is_saved` is independent from the relationship lifecycle. A relationship can be saved or not saved while its lifecycle status is contacted, considered, booked, or rejected.

Only `status = booked` confirms an identified booking. Setup declarations such as a booked category do not create a real Vendor relationship. Multiple Vendors in one category are valid. Replacing a booking is expressed as deliberate changes to two separate relationships rather than an assumed atomic swap.

### 6.5 Booked Vendor to Budget Synchronization

The relationship status and agreed price are the authoritative booking facts. When a relationship is booked and has a non-null agreed price, a database-owned rule creates or reuses exactly one canonical `budget_items` row with source `booked_vendor`.

- The application action does not independently create a second expense.
- Changing the agreed price updates the active commitment through the same database rule.
- Unbooking or clearing the price removes the active commitment but retains the canonical item and its payment history.
- Rebooking reuses the existing canonical item.
- Manual expenses remain separate and cannot impersonate or detach a canonical booking item.

### 6.6 Budget Calculations

For each budget item:

```text
active commitment = committed amount, or zero when inactive
actual paid       = sum of payments marked paid
item impact       = max(active commitment, actual paid)
```

The overall values are calculated as follows:

```text
available budget   = total budget - sum(item impact)
remaining committed = sum(max(item commitment - item paid, 0))
```

The per-item maximum is calculated before summing, so an overpayment on one expense cannot offset another expense. A missing total budget produces an unknown available amount rather than a fabricated number. A negative available amount remains visible. If historical paid or scheduled amounts exceed a reduced commitment, the UI presents a reconciliation state and does not invent a refund.

### 6.7 Task Workflow and Urgency

Task workflow and date urgency are separate concepts:

- Stored statuses: Not started (`open`), In progress, Waiting on vendor, and Completed.
- “Open” dashboard totals include every incomplete status.
- Completed tasks never display an overdue state.
- Overdue means incomplete with a due date before the current Israel calendar date.
- Due soon includes today through the next seven days.
- Quick reopen returns a task to Not started; the edit form can select any permitted status.

All date-only calculations use the Israel calendar so that UTC offsets and daylight-saving changes do not move a wedding or due date to another day.

### 6.8 Wedding Date Phases

The existing wedding-date component selects one state:

- no date;
- normal planning, more than seven days before;
- final week, seven to two days before;
- day before;
- wedding day;
- post-wedding.

These states change only the existing date/countdown presentation. They do not create a separate Wedding Week dashboard or a new copy of tasks, payments, vendors, or guests.

### 6.9 Vendor Publication and Reviews

A Vendor profile is public only after the Vendor explicitly publishes it. Public pages use deliberately public fields, gallery images, and approved reviews. Vendor owners may update only their own profile and images. Couple-authored reviews remain controlled by the authoring Couple; Vendors can read their feedback but cannot edit it.

### 6.10 Wedding Assistant Boundary

The Assistant receives the Couple's message and server-selected context. It can read relevant wedding, task, budget, payment, guest-summary, and vendor information and return bilingual guidance with source labels. It cannot directly mutate product data. Any future write capability would require a separate proposal, explicit confirmation, fresh authorization, and server-side revalidation design.

---

## 7. State Management

Ever After does not use Redux or a separate client-side server cache. State is assigned to the narrowest appropriate owner.

| State category | Owner | Examples |
| --- | --- | --- |
| Durable product state | PostgreSQL through Supabase | Wedding Details, tasks, guests, vendor relationships, expenses, payments, reviews, Vendor profiles, Assistant history. |
| Authentication state | Supabase Auth session cookies | Current identity and session refresh. The database role/ownership remains the authorization source. |
| Server-rendered page state | Server Components and feature queries | Dashboard summaries, Timeline groups, marketplace results, budget totals, profile completion. |
| URL state | Search parameters | Marketplace search, filters, sort, category, and pagination. This makes filtered views linkable and reload-safe. |
| Form submission state | `useActionState` and Server Action results | Pending state, field errors, form-level errors, and confirmed success feedback. |
| Local transient state | Component-local React state | Mobile menus, password visibility, wizard step, unsaved draft values, open dialogs, selected typeahead option, upload progress, and active chat composer text. |
| Visual-only state | Component refs, observers, and media-query state | One-time reveals, counters, scroll-driven Timeline progress, and reduced-motion completion. Visual state never changes business truth. |

### 7.1 State Rules

- Persisted server data is never duplicated into a long-lived global client store.
- A mutation is considered successful only after the server and database confirm it.
- Pending controls prevent accidental repeated submissions where duplicate work would be unsafe.
- Failed forms preserve the user's entered values and show field-specific feedback.
- Route revalidation refreshes affected summaries after successful changes.
- Wedding Setup sections that save independently do not submit unrelated stale draft values.
- Assistant history is application-owned persisted state; composer input and pending animation are temporary client state.
- Animations reflect already confirmed values and never imply an unconfirmed save, booking, or payment.

---

## 8. Error Handling

Errors are handled at the nearest boundary that can provide a useful and safe response.

### 8.1 Error Categories

| Error type | Application behavior |
| --- | --- |
| Validation error | Return field-level messages and preserve the form values. Move focus to the relevant field or setup step when appropriate. |
| Authentication error | Show a generic sign-in/registration message or redirect to the correct role-specific login page. Do not expose provider details. |
| Authorization or ownership failure | Reject the operation and return a safe unavailable/forbidden result. Do not reveal whether another user's private record exists. |
| Database constraint error | Convert known conflicts into understandable business feedback, such as invalid payment totals or a protected canonical expense. |
| Zero affected rows | Treat as failure or stale ownership/state, not as successful update/delete. |
| Stale Wedding Details save | Reject the conflicting form using its original revision value; keep the user's draft for review rather than silently overwriting newer data. |
| Query/load failure | Show an error or unavailable state rather than replacing missing data with zero, an empty list, or invented facts. |
| Image upload failure | Retain existing images and report a safe size/type/upload error. Do not create metadata for a failed upload. |
| Assistant/provider failure | Return localized safe copy, preserve the thread when possible, and avoid exposing tokens, raw provider messages, or internal context. |
| Missing local configuration | Keep public landing/demo marketplace usable and make private or authenticated operations fail with setup guidance. |
| Route-level rendering failure | Use route error boundaries, loading states, and not-found pages appropriate to the route. |

### 8.2 Feedback Principles

- Errors are rendered as plain user-facing text; raw SQL, stack traces, tokens, and secret-bearing URLs are never displayed.
- Success feedback appears only after confirmed persistence.
- Destructive operations use explicit controls and cannot be triggered by ordinary navigation.
- Ambiguous write outcomes are not automatically retried when a duplicate booking, payment, or message could result.
- Revalidation is targeted so an error in one feature does not unnecessarily reset unrelated page state.

---

## 9. Input Validation

Validation is layered:

1. Native HTML constraints and controlled UI options provide immediate usability feedback.
2. Zod schemas validate every Server Action and JSON Route Handler request.
3. Server logic validates authenticated ownership and cross-record business rules.
4. PostgreSQL types, checks, unique constraints, foreign keys, and triggers provide the final durable boundary.

Client validation is never trusted as the only protection.

| Input area | Main validation rules |
| --- | --- |
| Authentication | Valid normalized email; required password; confirmation must match; role-specific signup fields; safe redirect destination; supported confirmation type; and a non-empty bounded token hash without whitespace/control characters. URL-supplied role and destination values do not authorize or route confirmation. The second Couple email is contact information only. |
| Wedding Details | Valid date-only value; non-negative guest estimate and budget; known area/event/style/priority options; conditional venue fields; bounded text; internally valid setup status. |
| Tasks | Required bounded title; known category, status, and priority; valid optional date; bounded notes. |
| Marketplace filters | Known category/subcategory/area/service values; bounded search text; valid positive page; coherent price and capacity ranges; valid rating threshold. |
| Vendor relationship | Known lifecycle status; exactly one marketplace or External Vendor identity; bounded private notes; non-negative agreed price; no invented taxonomy. |
| External Vendor | Required business name and real service classification; optional bounded contact fields and agreed price. |
| Budget item | Required bounded label; known category/source; non-negative monetary values; canonical link/source fields cannot be changed through manual expense input. |
| Payment | Positive amount, valid optional due/paid dates, bounded notes, and schedule total compatible with the active commitment for new obligations. |
| Guest | Required identity/household data as appropriate; valid RSVP state; positive/non-negative counts; bounded contact and notes fields. |
| Review | Marketplace Vendor target; rating dimensions from 1–5; bounded review text; one ordinary review per Couple and Vendor relationship. |
| Vendor profile | Required business identity; valid category/subcategory relationship; coherent price/capacity ranges; known areas/services/styles/event types; valid public URLs and contact fields. |
| Vendor image | Approved image MIME type, maximum 5 MB, authenticated owned path, safe metadata, and exactly one stored source. |
| Assistant request | Authenticated Couple; non-empty bounded message; valid optional thread and language values; wedding-domain scope; no client-supplied private context. |

### 9.1 Data Normalization

- Currency entered in shekels is converted to integer agorot before persistence and formatted back for display.
- Empty optional fields become `null` or an intentional empty collection according to the schema; empty strings are not treated as meaningful business data.
- Emails and comparable search inputs are trimmed and normalized where appropriate.
- Calendar dates remain date-only values. They are not converted into arbitrary UTC timestamps.
- URL and enum inputs are selected or parsed into known values before database operations.

---

## 10. Planning the Main User Experience

The UX is organized around three experiences: public visitors, authenticated Couples, and authenticated Vendors. Each role receives a consistent shell and only the navigation relevant to that role.

### 10.1 Route and Experience Map

| Route | Audience | Main experience |
| --- | --- | --- |
| `/` | Public | Landing page explaining the product, benefits, and entry points. |
| `/auth/couple` | Public | Couple login and registration in one public-auth experience. |
| `/auth/vendor` | Public | Vendor login and registration. |
| `/auth/forgot-password` | Public | Request a password-reset email. |
| `/auth/confirm` | Public | Render a non-mutating email-confirmation or recovery page; verification occurs only after explicit submission. |
| `/auth/reset-password` | Public recovery session | Set and confirm a new password using the shared public navigation. |
| `/auth/verification` | Public | Explain email-confirmation state and next action. |
| `/vendors` | All audiences | Searchable and filterable public Vendor marketplace. |
| `/vendors/[slug]` | All audiences | Public business information, gallery, approved reviews, and Couple relationship controls when signed in. |
| `/wedding` | Couple | Our Wedding dashboard and date/countdown summary. |
| `/wedding/setup` | Couple | Optional guided setup with progress and independent booking controls. |
| `/wedding/details` | Couple | Single editable source for Wedding Details. |
| `/wedding/timeline` | Couple | Chronological presentation derived from dated Tasks. |
| `/tasks` | Couple | Task creation, filtering, editing, workflow actions, and deletion. |
| `/vendors/my` | Couple | Saved, contacted, considered, booked, rejected, and External Vendors. |
| `/budget` | Couple | Budget totals, expense commitments, payment schedules, and history. |
| `/guests` | Couple | Guest/household records and aggregate attendance summary. |
| `/reviews` | Couple | Couple-authored review management. |
| `/assistant` | Couple | Bilingual grounded chat and conversation history. |
| `/settings` | Couple | Account presentation, avatar/preferences, password entry point, and logout. |
| `/vendor` | Vendor | Business-profile completion, rating, and recent-review summary. |
| `/vendor/profile` | Vendor | Business profile, public attributes, publication state, and gallery management. |
| `/vendor/settings` | Vendor | Vendor account context and logout. |

### 10.2 Couple Journey

1. Register or sign in through the Couple authentication page.
2. When confirmation is enabled, open the confirmation page and explicitly verify the primary email.
3. Continue to Our Wedding after the confirmed session and stored Couple role are recognized.
4. Complete, partially complete, or skip Wedding Setup when desired.
5. Add and manage Tasks; view dated Tasks in the Timeline.
6. Explore Vendors, review profiles, save options, and record relationship status.
7. Enter agreed prices for booked Vendors and manage related payments in Budget.
8. Manage guests and reviews through their dedicated pages.
9. Ask the Wedding Assistant questions using the Couple's existing planning context.
10. Return to Wedding Details whenever the underlying wedding information changes.

### 10.3 Vendor Journey

1. Register or sign in through the Vendor authentication page.
2. Review profile-completion information on the Vendor dashboard.
3. Complete the business profile, service attributes, areas, pricing information, and gallery.
4. Explicitly publish the profile when it is ready.
5. Review ratings and Couple-authored feedback in read-only form.
6. Browse the public marketplace without receiving access to another Vendor's management data.

### 10.4 Interaction and Responsive Principles

- Public pages share one public header and one mobile-menu implementation.
- Couple and Vendor pages share the authenticated application shell but expose different navigation links.
- Mobile layouts collapse multi-column forms and cards without horizontal overflow.
- Form fields use persistent labels, clear optional markers, visible focus, and field-level errors.
- Buttons expose idle, hover/focus, pending, success, and error states based on real application state.
- Empty states explain what is missing and provide the relevant next action.
- Statuses use text as well as color.
- The Assistant supports Hebrew and English direction, safe Markdown, and source labels.
- Motion is restrained, finite, and disabled or settled under reduced-motion preferences.
- Timeline progress is driven by scrolling; decorative motion never hides required content.
- Navigation and updates preserve user context where possible. Filtering is URL-based, and ordinary interactions should not reset unrelated page or scroll state.

---

## 11. Traceability to the Course Requirements

| Course requirement | Covered in this document |
| --- | --- |
| Project folder structure | Section 1 |
| Structure of the main components | Section 2 |
| Database structure | Section 3 |
| Main CREATE / READ / UPDATE / DELETE operations | Section 4 |
| API description | Section 5 |
| Main business logic | Section 6 |
| State management | Section 7 |
| Error handling | Section 8 |
| Input validation | Section 9 |
| Planning the main user experience | Section 10 |
