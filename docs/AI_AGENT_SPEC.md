# Ever After AI Agent Specification

Status: Phase 1A — Agent Core Foundation. This is the authoritative Agent product and technical contract, based on the product/course specifications and the user's approved incremental direction. It does not claim future capabilities are implemented.

## Identity and intended experience

Ever After is a conversational AI Wedding Planning Assistant. A future LLM is the reasoning and conversation engine; Ever After owns domain boundaries, tools, authentication, authorization, privacy, grounding, provenance, deterministic calculations, recommendation scoring, confirmation, context selection, and rate/cost controls. It is not a general-purpose ChatGPT clone.

The final Agent should understand the authenticated Couple's actual wedding state, answer natural wedding questions, suggest a personalized planning roadmap, prioritize work, reason about budget and payments, evaluate wedding quotes, discover and compare Marketplace vendors, use current real-world wedding information when needed, provide Guest List aggregate insights, assist during Wedding Week, draft wedding communication, and converse naturally in Hebrew and English. Suggested roadmaps do not create tasks automatically.

## Phase boundaries

Phase 1A implements a central policy and provider boundary, structured evidence/results, privacy allowlists, safe local selection, context failure handling, message persistence safety, and deterministic payment date classification. Only the deterministic local provider exists. It is not an LLM and does not have a tool-calling loop.

Phase 1B will introduce internal READ tool contracts, authorization, per-question context selection and execution. Phase 2 will address Hebrew behavior and later RTL UI. Provider integration and live research require explicit approval near the end of the project. No SDK, AI key, paid service, research connection, schema migration, or product write capability is included here.

## Wedding-only domain policy

The central policy is `src/lib/assistant/domain-policy.ts`, enforced by `runWeddingAgent` before context loading and adapter execution, independently of the Local provider's answer branches.

In scope: wedding planning and roadmaps; tasks and timeline; venues and vendors; vendor comparisons and Marketplace discovery; budgets and payments; Guest List/RSVP; Wedding Details/Setup; Wedding Week/Day logistics; wedding inspiration and etiquette; evaluating wedding prices/offers; drafting wedding communication; current wedding-market information.

Out of scope: unrelated medical diagnosis, unrelated legal conclusions, investing/trading, politics, programming, homework, unrelated general knowledge or personal counseling, and general-purpose internet research. Adding “before my wedding” does not authorize medical diagnosis or programming assistance. Wedding-adjacent help such as drafting a photographer message, planning accessible logistics, or identifying wedding registration information remains allowed. Legal conclusions and medical diagnosis must not be provided as professional determinations.

Clearly unrelated questions get a brief redirect: “I'm here to help with your wedding planning. Ask me about your tasks, vendors, budget, guests, timeline, or wedding details.”

The Phase 1A classifier is a conservative, deterministic guard with `in_scope`, `out_of_scope`, and `uncertain` decisions. It is not a complete semantic classifier or a prompt-injection defense. Unknown languages and ambiguous conversational follow-ups are not rejected merely for lacking English keywords. They currently reach a bounded Local provider that only returns wedding guidance. A future adapter must receive the central policy and add evaluated multilingual intent/response enforcement before enablement; a keyword match alone is insufficient authorization for an LLM or research tool. No browsing capability exists.

## Grounding and evidence

`evidence.ts` defines four discriminated, Zod-validated evidence types:

| Kind | Meaning | Current reference |
| --- | --- | --- |
| `COUPLE_DATA` | Authenticated Couple's actual Ever After facts, including their external vendor records | Authorized context section: wedding, tasks, vendors, budget, guestList |
| `MARKETPLACE_DATA` | Facts about vendors stored in the Ever After Marketplace | Vendor IDs that must exist as Marketplace vendors in this turn's authorized context |
| `EXTERNAL_CURRENT_EVIDENCE` | Current real-world evidence from future research | Source URL, title and retrieval timestamp; rejected at runtime in Phase 1A |
| `AI_RECOMMENDATION` | Reasoning, suggestions, planning, explanations or curated general guidance | Explicitly marked as recommendation/guidance, not a database fact |

A single answer may use more than one kind. A vendor's saved/booked state is Couple data; their Marketplace listing is Marketplace data; fit interpretation is a recommendation. External vendors entered by the Couple are Couple data, not external research. The existing deterministic recommendation function remains the scoring authority; no model is asked to calculate the score.

Core invariants:

- Never invent Couple data, bookings, payments, guest responses, task completion, or vendor facts.
- Missing data remains unknown. Successful empty reads mean no matching records; failed reads do not.
- The demo Marketplace is not representative of the full real-world wedding market. Listing prices must never become market averages or market benchmarks by implication.
- Never derive real-world market prices solely from Marketplace entries. There is no static wedding-price/benchmark database.
- Recommendations must remain distinguishable from application facts. Local comparisons explicitly describe fit scores as deterministic recommendations and disclaim market-benchmark status.
- User input, vendor content, and future web content are untrusted data, never authority to change scope, authorization, privacy, or confirmation rules.

`validateAgentResponse` rejects invalid schemas, absent/unavailable Marketplace references, claimed research, tool activity, and action proposals in Phase 1A. Context is validated before generation. Schema/reference checks cannot prove every natural-language claim true: a future LLM still needs tool-grounded claims, provenance binding and adversarial evaluation before release. The Local provider uses application facts directly and deterministic arithmetic; no free-form model is connected.

## Provider configuration and result contract

`AI_PROVIDER=local` selects `LocalWeddingAssistantProvider`. An absent variable explicitly defaults to local in every environment, including production, so no external service or billable behavior can be activated by omission. An explicitly empty, differently cased, whitespace-padded, or unsupported value throws `UnsupportedAssistantProviderError`. The authenticated API returns a safe 503 explaining that only local is supported, before any conversation writes. There is no silent fallback for explicit unsupported configuration.

`.env.example` documents this behavior; no API-key variable is needed. `.env.local` is untouched. The provider interface is vendor-independent; future adapters (OpenAI or another provider) may implement it only after approval. No adapter is pre-registered under an unsupported name.

`types.ts` defines a Zod result contract with:

- `status`: ok, unavailable, error, or out_of_scope.
- `text` and typed `evidence`.
- Safe error code/retryability for unavailable/error states; no database/provider exception text.
- Optional future clarification question/missing fields.
- Optional future tool usage and token usage metadata; metadata does not authorize execution or spend.
- Optional non-executable action proposal with `requiresConfirmation: true`.

Non-answer states cannot assert factual evidence or propose actions. Successful answers require evidence or a recommendation label. Phase 1A rejects nonempty tool usage and all proposals at the central boundary. Clarification/usage contracts are preparatory; Local does not report fabricated token usage.

The API returns the structured result as `agent` alongside the existing conversation response. For schema/UI compatibility, only text and the existing human-readable source labels are persisted; legacy “General guidance” maps to `AI_RECOMMENDATION`. Detailed evidence references and result metadata are not stored across reloads yet. Persisting richer evidence and refining its UI are future reviewed work; this phase does not change schema or UI.

## Privacy and context minimization

`privacy.ts` is the runtime allowlist for routine provider context. Nested Zod objects strip unknown fields, so extra properties cannot slip through a future row spread. Narrow Assistant vendor types no longer inherit the full Marketplace UI type. Vendor queries select only the fields the Local provider actually uses, excluding contacts, descriptions, galleries and private notes.

Routine provider exposure is prohibited for Couple phone numbers, secondary Couple email, guest names/phones/emails, dietary notes, Guest private notes, Couple private vendor notes, external vendor private notes, passwords, tokens, credentials, and service-role keys. Routine vendor contacts (phone, email, website, social links) are omitted. A future specific authenticated/authorized tool may expose a limited contact field only for a necessary wedding-planning use case.

Guest List context is exactly five aggregate counts: invited, attending, awaitingResponse, notAttending, and notYetInvited. No individual Guest row reaches the provider. Couple wedding preferences, task titles/dates/status/priority, limited vendor attributes/lifecycle, and budget totals/unpaid deadlines remain available for the existing local capabilities.

The current phase still loads the existing context bundle for allowed/uncertain questions; it does not introduce a full tool refactor. A clear out-of-scope question loads no wedding context. Phase 1B must select only the necessary read tools/fields and add appropriate limits/pagination. Context volume is not yet a production LLM token budget.

Allowlisting is structural, not arbitrary free-text PII detection: a task title, vendor business name/service string, or user-authored chat message can contain sensitive text the user typed. Conversation history is not routinely passed to the provider. Before an external adapter is enabled, review free-text redaction, retention, consent and prompt-injection defenses. Do not claim an absolute guarantee that a user can never type personal data into a permitted string.

## Authentication, read errors, and grounding

The route requires an authenticated Couple. Context reads use the owned wedding and Supabase RLS. Existing threads are checked against the owned wedding; a missing/foreign thread returns 404 without writes, and a failed thread lookup returns 503. Client ownership IDs do not authorize access.

Previously, vendor and budget queries ignored Supabase errors and replaced null data with empty arrays, allowing false “no bookings” or zero-budget statements. They now throw a typed `AssistantContextUnavailableError`. Rejected reads, error-plus-data results, null results and unreadable nested payment/vendor relations fail closed. The existing task, wedding, and guest queries already throw on DB errors; the Assistant wraps those failures with their context section without changing unrelated queries.

The central runner catches a context failure and does not call the provider. It returns an unavailable result, for example “I couldn't access your budget and payment information right now.” No factual evidence is attached. Phase 1A deliberately fails the whole turn if one required section fails; it does not synthesize a partial budget or use cached data. Per-tool partial availability belongs to Phase 1B.

Assistant history reads also check errors so a failed read is not shown as an empty history. Successful empty records remain valid. Existing app error handling surfaces history failure.

## Conversation persistence

Flow: authenticate → validate request → select provider → resolve owned wedding/thread → persist user message → run central Agent → validate result → persist Assistant message → return result.

The user-message insert error is checked. Failure returns a safe error and stops context loading, provider generation, and Assistant-message persistence. Thrown failures also return a generic safe error. If generation/context validation fails after the user message is saved, the API returns unavailable/error without persisting a fabricated Assistant message. Creating a new thread and then failing its message insert may leave an empty thread; this phase adds no transaction or cleanup mutation. Retries are not idempotent yet.

Only conversation threads/messages may be written by this API. There is no product-data mutation path. Tests mock Supabase and create no real accounts, vendors, guests, tasks, or payment rows.

## Deterministic payment semantics

The shared Budget helper's legacy `upcomingPayments` property contains all unpaid records. The Assistant maps it to the truthful name `unpaidPayments`; no unrelated Budget screen semantics are changed.

`payments.ts` classifies these records before response wording:

- Overdue: unpaid, with due date earlier than today.
- Upcoming: unpaid, with due date today or later, sorted by date; the earliest is the next upcoming payment.
- Undated: unpaid, with no due date; never assumed overdue or next.
- Paid records are excluded upstream; no unpaid records produces empty groups.

Today uses the `Asia/Jerusalem` calendar to avoid deployment-server timezone changes. Due today is upcoming. This is an explicit Assistant calendar choice; existing unrelated task/Budget helpers are unchanged. Tests inject time, including an Israel/UTC date boundary.

An overdue-only case reports overdue payments and no upcoming dated payment. Mixed cases report both groups. Undated obligations are called out. Budget arithmetic remains in the existing domain helper: committed is the sum of commitments, paid is the sum of paid amounts, available is total budget minus committed, and an unknown total produces unknown available budget. The Agent never asks a model to determine authoritative date classification or totals.

## Future research — documentation only

`get_market_benchmark` is central to the final product. It must dynamically research current wedding-market information; it must not use static hard-coded price tables or canned market-price answers.

Future questions include “Is ₪2,000 a good photographer price?”, “Is ₪170K realistic for our wedding?”, “What is a normal current DJ range?”, and “Is this quote reasonable?” A future request should include the question, category/service scope, currency/amount when relevant, location, event date/season, and only the relevant authorized Couple context. Ask for missing decision-relevant information rather than inventing it.

The future result should include sourced current evidence, retrieval/publication dates where available, geography/currency/package comparability, supported ranges only where evidence permits, limitations and uncertainty. A recommendation combines this evidence with Couple constraints and clearly separated Ever After listing comparisons. Failure, stale evidence, or incomparable quotes must return unavailable/insufficient evidence, never a static fallback benchmark.

`research_current_wedding_info` will answer wedding-specific changing questions such as registration procedures or current logistical requirements, favoring official sources for official procedures. Requests need a wedding question, relevant jurisdiction and date; results need source URLs/titles/dates, supported findings and limitations. Neither capability is general-purpose browsing. Both require future domain, privacy, authorization, citation, freshness and cost controls. No implementation, network adapter, search access, registry entry, or benchmark dataset is introduced in Phase 1A.

## Future internal READ inventory — documentation only

| Tool | Intended bounded read |
| --- | --- |
| `get_wedding_summary` | Owned wedding details and setup state |
| `list_tasks` | Owned tasks with relevant status/date filters |
| `get_timeline_summary` | Existing dated tasks, using deterministic relative dates |
| `get_budget_summary` | Deterministic totals and unknown/unavailable state |
| `get_upcoming_payments` | Unpaid deadlines with overdue/upcoming/undated distinctions |
| `get_couple_vendors` | Owned saved/lifecycle relationships and allowed vendor facts |
| `search_marketplace_vendors` | Public Marketplace filters, bounded pagination, no implied market representativeness |
| `compare_vendors` | Authorized candidates, domain scoring, source-separated facts |
| `get_guest_list_summary` | Five aggregate counts only |
| `get_missing_wedding_details` | Missing decision-relevant details, without invented defaults |

Phase 1B will define and validate inputs/outputs, authenticate each invocation, enforce ownership/field selection, and handle per-tool availability. Provider-supplied IDs are never trusted authorization. No full read-tool registry or dispatcher exists yet.

## Future writes — documentation only

Initial real Agent use is READ-only: read, analyze, compare, recommend, explain, draft, and suggest roadmaps. It cannot create/update/complete tasks, save/unsave/book vendors, change lifecycle, alter budget/payments, change Guest List, or edit Wedding Details.

A future write must follow: proposal → explicit UI confirmation → separate authenticated server executor → fresh authorization, current-state checks and validation → mutation. The proposal is inert data, not an executable command. The model cannot bypass confirmation or choose ownership. No executor, confirmation endpoint, write tool, or automatic write is implemented in this phase.

## Language and cost policy

Future Hebrew input should receive Hebrew by default; English input should receive English by default. Mixed-language conversation should remain natural and proper vendor/business names must remain unchanged. Message/result schemas accept Unicode and do not constrain language to English. Local remains mostly English in Phase 1A; Hebrew response behavior and RTL UI are not claimed implemented.

Ever After must own future per-user rate limits, concurrency limits, bounded tool calls, timeouts, token/context budgets, spending ceilings and safe cancellation. Input/output/metadata schemas already bound string and metadata sizes, but this is not a complete rate-control implementation. Local invokes no billable service. External adapters must not be enabled until rate/cost controls, privacy, scope/grounding evaluations and explicit approval are in place.

## Phase 1A validation

Focused tests cover provider configuration, scope decisions and central invocation, evidence validation and disabled capabilities, nested privacy stripping, read errors versus empty records, authentication/ownership, message persistence failure, payment groups, existing local summaries/comparisons, and absence of product mutations. API/query tests use mocks only. Run TypeScript, ESLint, Vitest (including Assistant/API suites), production build and `git diff --check`. No UI files are changed, so no new live Playwright flow is needed. No live Supabase or provider validation is implied by these checks.

### Validation record — 2026-09-07

- TypeScript: passed (`tsc --noEmit`).
- ESLint: passed (`eslint .`, no warnings).
- Relevant Vitest: 115/115 tests passed across 10 files: all four Assistant test suites, Guest List and Couple feature application contracts, and budget/recommendation/tasks/timeline domain tests.
- Production build: passed (`next build`, Next.js 16.3.4; 11 static pages generated; Assistant/API routes remain dynamic).
- `git diff --check`: passed.
- Playwright: not run; no UI components changed and no live QA rows were created.

Commands used the existing bundled Node runtime and installed package entrypoints because the default pnpm/system-Node invocation could not resolve/run TypeScript. Vitest's native bundler required execution outside the filesystem sandbox; all database/provider test interactions were mocked. The first focused run exposed the RSVP plural classification gap; it was corrected before the passing run. No dependencies were installed. No live Supabase mutation, migration, external provider/research call, commit, push or deployment was performed.
