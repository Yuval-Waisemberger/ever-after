# Ever After AI Agent Specification

Status: Agent foundation Phases 1A, 1B, 1C-A, 1C-B and Phase 2 bilingual UX are complete. Setup booking/declaration semantics, current financial rules, Waiting on vendor and the shared countdown phase model are integrated. This is the authoritative Agent contract. Only the deterministic Local provider exists; external AI, live research and product-write execution remain unimplemented.

## Identity and intended experience

Ever After is a conversational AI Wedding Planning Assistant. A future LLM is the reasoning and conversation engine; Ever After owns domain boundaries, tools, authentication, authorization, privacy, grounding, provenance, deterministic calculations, recommendation scoring, confirmation, context selection, and rate/cost controls. It is not a general-purpose ChatGPT clone.

The final Agent should understand the authenticated Couple's actual wedding state, answer natural wedding questions, suggest a personalized planning roadmap, prioritize work, reason about budget and payments, evaluate wedding quotes, discover and compare Marketplace vendors, use current real-world wedding information when needed, provide Guest List aggregate insights, assist during Wedding Week, draft wedding communication, and converse naturally in Hebrew and English. Suggested roadmaps do not create tasks automatically.

## Phase boundaries

Phase 1A implements a central policy and provider boundary, structured evidence/results, privacy allowlists, safe local selection, context failure handling, message persistence safety, and deterministic payment date classification. Only the deterministic local provider exists. It is not an LLM and does not have a tool-calling loop.

Phase 1B implements ten internal READ tools, validated contracts, authorization and bounded execution. It prepares selective context access; it does not add automatic per-question orchestration or a model tool loop. Phase 2 will address Hebrew behavior and later RTL UI. Provider integration and live research require explicit approval near the end of the project. No SDK, AI key, paid service, research connection, schema migration, or product write capability is included here.

Phase 1C-A adds separate future research contracts, structured eligibility/current-claim policies, request minimization and provenance validation. It adds no executable research registration, adapter implementation, natural-language tool router, UI, database query or mutation. The existing Local runner and internal READ registry remain unchanged.

Phase 1C-B adds a separate `assistant/planning` layer. It consumes fresh, authenticated internal tool results, produces bounded deterministic planning signals, and prepares quote, clarification, conversation-window and follow-up contracts. It does not execute a tool plan, generate final roadmap prose, persist a roadmap, create tasks or change the current Local provider/API/UI. A separate opt-in server history reader is implemented but not wired into the current provider. Hebrew/RTL implementation remains future work.

## Planning and conversation foundation — Phase 1C-B

### Orchestration and capability mapping

`planning/policy.ts` accepts a structured, server-reviewed capability, scope and optional budget-market-comparison flag. It returns needed/optional READ-tool names, whether clarification may be needed, research eligibility/evidence classes, scope and `executionEnabled: false`. Scope is not inferred from English keywords. Out-of-scope and uncertain requests receive no READ-tool plan; uncertain scope requires clarification. Model/client assertions alone never authorize calls. There is no dispatcher, fake reasoning engine, automatic loop or heavyweight Skill framework.

| Capability / skill | Tool or deterministic foundation |
| --- | --- |
| Wedding Context Understanding | `get_wedding_summary`, `get_missing_wedding_details` |
| Personalized Wedding Roadmap | `buildPlanningState`: wedding, task, vendor, budget and payment results; optional Guest aggregates |
| Task Prioritization | `list_tasks`, stored priority and calendar deadlines |
| Timeline Guidance | `get_timeline_summary`, existing task-derived timing |
| Budget Awareness | `get_budget_summary`, authoritative stored/calculated totals |
| Payment Awareness | `get_upcoming_payments`, shared unpaid-payment classification |
| Vendor Discovery | `get_wedding_summary`, `search_marketplace_vendors` |
| Vendor Comparison | `get_couple_vendors`, `compare_vendors`; existing deterministic scoring unchanged |
| Market Price Evaluation | Validated quote/context → future non-live `get_market_benchmark` |
| Guest List Insights | `get_guest_list_summary` only; no individual Guest data |
| Wedding Week Guidance | Date phase, tasks, payments, booked vendor facts, aggregate responses |
| Wedding communication drafting | Future model, user context, optional relevant Couple vendor read |
| Grounding / uncertainty | Typed source states, missing/partial limitations, evidence and deterministic signal references |
| Wedding-only domain enforcement | Existing domain guard and server-reviewed orchestration/research scope |
| Hebrew / English conversation | Language-neutral intent/reason codes, Unicode content and unchanged business names; future provider follows input language, RTL later |

“What should we do next?” selects wedding, tasks, missing details, Couple vendors, budget and payments; Guest aggregates are optional when relevant, especially near the wedding. “Is our budget enough?” first needs wedding/budget facts; a real-market conclusion additionally requires future benchmark evidence, with optional vendor/payment comparisons. “Find photographers” selects wedding/search, and comparison only for finalists. “Is this quote reasonable?” selects wedding context plus the quote contract and future benchmark, with optional Marketplace comparisons. “How many guests haven't replied?” selects only Guest aggregates. Do not call every optional tool, duplicate tasks with timeline reads unnecessarily, or load an unrelated history window. Future orchestration must choose actual filters/arguments and reauthorize each READ invocation through the existing executor.

### Structured roadmap and personalization

`planning/roadmap.ts` accepts a strict bounded bundle of existing tool results plus the actual task/vendor invocation inputs. This is an internal server boundary, not a client endpoint or model-supplied evidence bag. Each tool result retains success/empty/unavailable semantics; not-requested sources stay explicit. Invalid source contracts, duplicated signal IDs, stale task/payment as-of dates or mismatched pagination fail closed. Successful empty reads remain factual; unavailable sections have null facts, empty evidence and explicit limitations, never fabricated zero values.

The output contains the actual wedding details, bounded tasks/vendor relationships, authoritative budget totals, classified unpaid payments, Guest aggregates, missing-detail fields, source statuses/evidence, phase, vendor gaps, deterministic signals and bounded roadmap windows. Wedding facts include date, guest estimate, broad location, event type, styles, priorities, setup/venue and booked categories. Saved/Considering facts remain available for future interpretation; they are never counted as Booked. Budget totals use the shared product domain calculation; vendor recommendation weights are unchanged.

No checklist dataset is created. Vendor-gap candidates come from explicit requested service categories, the known wedding's venue dependency, and a small mapping of stored Photography/Music/Design priorities to actual vendor taxonomy. The mapping translates existing Setup labels and taxonomy slugs, not English user intent. Other services are not universally assumed necessary. The current persisted model has no per-category low-priority flag; a validated, explicitly user-requested `lowerPriorityCategories` preference may reduce non-venue urgency without pretending it is stored Wedding Details. Unselected priorities are not assumed low priority.

Only a real Booked relationship confirms a booking. A Setup declaration suppresses a generic search signal but produces `vendor_details_needed`; it never produces a confirmed booking. The shared `booking-state` domain distinguishes confirmed, reported/details-later, not-recorded and unknown/review states. Legacy venue status/name is declaration metadata only. Gaps mean **not recorded booked**, not proof that the Couple lacks a vendor outside Ever After. Gaps stay unknown if wedding/vendor evidence is unavailable, the vendor selection is filtered/paginated, or an unclassified booking could cover the service. This bounded foundation does not scan all relationship pages automatically. Preferred missing services near the wedding get elevated priority; lower-priority services stay low, while venue dependency can remain urgent. It never invents vendor arrival/contact details, transport arrangements, venue instructions or a wedding-day schedule.

Non-completed overdue tasks, actual scheduled tasks, unpaid deadlines and undated obligations produce referenced signals. An overcommitted budget uses the existing negative available amount, not a model calculation or market judgment. In the final month/week/day, actual awaiting-response and not-yet-invited aggregate counts produce readiness signals. Post-wedding state keeps real task/payment obligations but stops pre-wedding booking/RSVP signals. It does not create a made-up post-wedding checklist.

Roadmap windows are immediate (overdue or due today, plus explicit readiness concerns), next 7 days, next 30 days, later and undated. `horizonDays` is 1–30; shorter requests constrain both future windows accordingly. At most 150 signals are accepted and each window lists at most 20 signal IDs with an explicit omitted count. Underlying tool bounds remain: 50 tasks, 20 vendors, 20 payments per group and aggregate-only guests. Partial selections carry limitations; “no signals in available data” is not an assurance that the wedding is fully on track. Missing relevant source/detail context yields a limited state. Missing fields remain in the missing-details result and missing source/date information in limitations; they do not block all useful general guidance.

Facts retain COUPLE_DATA / MARKETPLACE_DATA tool evidence. Each `DETERMINISTIC_SIGNAL` carries a reason code, actual entity IDs where appropriate, source-tool references and a priority basis (deadline, stored task priority, Couple priority, explicit request, venue, finances or Guest responses). Phase is deterministic date logic. Future external evidence is explicitly unavailable. A future model's final explanation/prioritization must be AI_RECOMMENDATION and may not invent an urgency reason. Roadmap items are analysis/suggestions only; no executable action payload exists.

### Date phases and Wedding Week readiness

The builder reuses `getWeddingPhase`, `calendarDayDifference` and `classifyUnpaidPayments`, using an injected clock and the Asia/Jerusalem calendar. Phases are unknown date, before wedding (>30 days), final month (8–30), Wedding Week (1–7), Wedding Day (0) and post-wedding (<0). Countdown output never becomes negative: remaining days clamp to zero after the wedding, with a separate nonnegative days-since value. Missing dates give null timing; absolute task/payment deadlines still work. There is no system-clock or Supabase date manipulation.

Wedding Week/Day readiness currently means grounded signals from available tasks, unpaid payments, recorded bookings, wedding details and Guest totals. It does not mean day-of logistics/schedules/contacts have been implemented. No UI mode changes occur in this phase.

### Clarification and quote extraction boundary

`clarificationSchema` represents `required`, missing field codes, question intent and why each matters. It contains no final English question. `prepareQuote` checks a future model's structured extraction, combines it with already-known wedding context and asks only for material missing facts. Quote evaluation needs service/category, a currency-bearing quote and a sufficiently specific region; photography additionally needs coverage duration and whether video is included. Second-professional/album/add-on details remain optional assumptions rather than forcing every possible question. Flexible region is not a specific location. Known region/date/guest estimate are reused rather than requested again.

`normalizedQuoteSchema` supports category, controlled service detail, minor-unit amount/currency, hours, professional count, inclusions, add-ons, video scope, area and event type. Unknown/free-form/contact properties and contradictory service/video scope are rejected. No natural-language extractor exists yet. A complete normalized proposal can produce a **non-live normalized research request**, never a call. Phase 1C-B extends the existing future benchmark request with bounded coverage hours/professional count/video boolean so these material facts survive minimization. Add-ons remain separate from included features and produce an explicit price-scope limitation. Raw offer prose is never automatically forwarded. Exact wedding day/guest count still become month/50-person band. No benchmark prices or final prose are generated.

### Conversation and follow-up context

`history-server.ts` provides an opt-in future reader: authenticate with `getUser`, require Couple role, resolve the user's owned wedding, prove the requested thread belongs to it, then read only id/role/content/created_at. It fetches the newest eight messages plus one lookahead, ordered by creation time and ID; no lifetime history or action-proposal JSON is loaded. Read/auth failures return typed unavailable, distinct from genuinely empty history. No client wedding ID, new table, persistence write, external memory or provider call is introduced. The existing Local path remains stateless and unchanged.

`buildConversationWindow` limits each message to 2,000 characters and total content to 10,000. Oversized/non-fitting messages are omitted whole (reported explicitly), not silently truncated; an incomplete history cannot be treated as fully resolved context. It restores chronological order and can accept server-reviewed relevant message IDs within that recent window. Messages are untrusted conversation, not verified application facts/instructions. A compact application-owned summary is future work, not implemented or persisted now.

History remains **server-local, `providerReady: false`**. User-authored chat can itself contain names or private text; this phase does not claim regex-based PII redaction of arbitrary language. Future semantic relevance/privacy review must minimize it before any provider disclosure. History is never a research payload. This distinction does not relax aggregate-only Guest or minimal vendor/account tool-output rules.

Follow-up references are ephemeral validated server-owned snapshots scoped to wedding AND thread, expiring after 15 minutes: at most four vendor IDs, six tool name/status references, one planning topic and one unresolved clarification. No full tool payload, names, contact details or Guest entities are stored in this structure. Resolution requires freshly authorized vendor IDs, drops stale references, removes clarification fields already known and requests fresh tool results. Past results are pointers, not current facts or authorization. Thus “which one would you choose?” can retain the recent comparison candidates without repeated business names, while a future model still performs reasoning. No automatic snapshot persistence or Local follow-up behavior is claimed.

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

The Local compatibility path still loads the existing context bundle for allowed/uncertain questions. A clear out-of-scope question loads no wedding context. Phase 1B's new tool outputs have their own strict field and volume bounds, but the existing Local path does not automatically select these tools. Context volume on that legacy path is not yet a production LLM token budget.

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

The shared Budget helper's legacy `upcomingPayments` property contains active unpaid records, including overdue payments. Unpaid schedules of unbooked canonical vendor expenses are excluded; actual paid spending remains in Budget totals. The Assistant maps this to `unpaidPayments`.

`payments.ts` classifies these records before response wording:

- Overdue: unpaid, with due date earlier than today.
- Upcoming: unpaid, with due date today or later, sorted by date; the earliest is the next upcoming payment.
- Undated: unpaid, with no due date; never assumed overdue or next.
- Paid records are excluded upstream; no unpaid records produces empty groups.

Today uses the `Asia/Jerusalem` calendar to avoid deployment-server timezone changes. Due today is upcoming. This calendar policy is now shared with Task/Dashboard/deadline domain helpers. Tests inject time, including an Israel/UTC date boundary.

An overdue-only case reports overdue payments and no upcoming dated payment. Mixed cases report both groups. Undated obligations are called out. Budget arithmetic remains in the existing domain helper: committed is the sum of commitments, paid is the sum of paid amounts, available is total budget minus the sum of each item’s max(active commitment, actual paid), and an unknown total produces unknown available budget. The Agent never asks a model to determine authoritative date classification or totals.

## Future research — contracts only (Phase 1C-A)

`get_market_benchmark` is central to the final product. It must dynamically research current wedding-market information; it must not use static hard-coded price tables or canned market-price answers.

Future questions include “Is ₪2,000 a good photographer price?”, “Is ₪170K realistic for our wedding?”, “What is a normal current DJ range?”, and “Is this quote reasonable?” A future request should include the question, category/service scope, currency/amount when relevant, location, event date/season, and only the relevant authorized Couple context. Ask for missing decision-relevant information rather than inventing it.

The future result should include sourced current evidence, retrieval/publication dates where available, geography/currency/package comparability, supported ranges only where evidence permits, limitations and uncertainty. A recommendation combines this evidence with Couple constraints and clearly separated Ever After listing comparisons. Failure, stale evidence, or incomparable quotes must return unavailable/insufficient evidence, never a static fallback benchmark.

`research_current_wedding_info` will answer wedding-specific changing questions such as registration procedures or current logistical requirements, favoring official sources for official procedures. Requests need a wedding question, relevant jurisdiction and date; results need source URLs/titles/dates, supported findings and limitations. Neither capability is general-purpose browsing. Both require future domain, privacy, authorization, citation, freshness and cost controls. Neither Phase 1A nor Phase 1B introduces their implementation, network adapter, search access, registry entry, or benchmark dataset.

### Implemented contract boundaries

`research/contracts.ts` exports Zod inputs/results and `futureResearchContracts`. Both entries have `live: false`, input/output schemas and **no execute method**. The active registry remains the ten internal READ tools. `unavailableResearchResult()` is a local pure helper: it returns `unavailable / RESEARCH_DISABLED`, a safe disclosure and `retryable: false`, with no price, source, data or research timestamp. No function performs research, creates a fake retrieval receipt or calls an adapter.

`ResearchAdapter` is an interface only: future `research(normalizedRequest, AbortSignal)` returns unknown output for Ever After validation. No adapter implementation, SDK, factory, provider-specific JSON or fallback is included. OpenAI built-in research or another research provider could eventually implement this boundary after approval, without owning product authorization, domain policy or calculations.

| Contract | Input | Successful/partial result data |
| --- | --- | --- |
| `get_market_benchmark` | Required purpose: service_quote, market_range or overall_budget. Category required except for overall budget; optional normalized package features, quote (integer minor-unit amount plus ILS/USD/EUR currency), broad region, event type, guest count and wedding date. Optional offer description stays local. | Purpose/category/region/country, event context, package assumptions, echoed quote if provided, currency, observed range, separately supported typical range, sourced pricing factors, quality/confidence and limitations. |
| `research_current_wedding_info` | Required wedding-only topic: marriage registration, ceremony documents, wedding procedures, industry norms or wedding logistics; optional planning context. | Topic/region/country, source-referenced findings, quality/confidence and limitations. No price-range field. |

These are deliberately bounded initial vocabularies for Israel (`countryCode: IL`) and the app's existing broad areas; they are not general search text. Research service categories cover venue, photography, videography, music, beauty/attire, design/flowers, food, transportation, officiant, event management, invitations/gifts and accommodation. Package features cover coverage duration, ceremony/reception, staffing/equipment, media outputs, travel, food/drinks and tax inclusion. No numeric prices are attached to categories or features. More jurisdictions, specific procedure assumptions or service detail require reviewed vocabulary extensions; unsupported questions should ask for clarification rather than smuggling free text into a generic search tool.

Output ranges use integer minor currency units, ordered low/high bounds and source IDs. Observed and typical ranges are distinct. A typical range requires a compatible observed range and references spanning at least two source domains; this is a necessary structural check, not proof of independent publishers, representative sampling or comparable packages. Successful benchmarks require an observed range and medium/high declared confidence. Partial results require explicit limitations; their observed/typical range can remain null where evidence cannot support one. Source references must resolve within the returned source list. Echoed quote/category/location/purpose/topic must match the authorized normalized request when provenance is validated. No currency conversion is invented.

### Source model and safe failure outcomes

All four evidence classes remain separate. `evidence.ts` now supports bounded optional source IDs, publisher/domain, publication/update dates, relevance and source type while preserving existing text/source-label compatibility. Research-specific sources additionally require an ID, `origin: external_research`, matching HTTPS URL/domain, retrieval timestamp, relevance and source type: official, reported market guidance, commercial article, advertised listing or research report. Publisher/publication/update dates remain absent when unknown. Dates must be consistent; credentials are forbidden in source URLs. Metadata and descriptions are untrusted content, never instructions.

| State | Meaning and constraints |
| --- | --- |
| SUCCESS | Some sufficient evidence supports the bounded result. Requires sources, research timestamp and validated data. |
| PARTIAL | Useful evidence exists with limitations, missing context or disagreement. Requires sources and limitations; assertions must be qualified. |
| UNAVAILABLE | Disabled, failed, timed out or safety-limited research. Strict schema forbids data, sources, ranges and researchedAt. |
| INSUFFICIENT_EVIDENCE | Research ran but cannot support a responsible conclusion (no relevant sources, stale sources, incomparable packages or conflicts). Has research timestamp, optional useful sources and limitations; strict schema forbids numeric result data/ranges. |

`validateResearchProvenance` checks the parsed result against the authorized normalized request and a **server-owned retrieval receipt**: every reported source must match an actually recorded source, and researchedAt must match that receipt and not be in the future. No receipt producer exists in this phase. A model-authored receipt is never trustworthy. Runtime receipt matching cannot prove that an article is accurate, sufficiently current or representative: future retrieval must establish these properties before classifying evidence as verified current. Source access time is not publication freshness.

`validateAnswerProvenance` checks bounded statements against a trusted evidence ledger built by Ever After from authorized tool results and verified research. References cannot be invented or relabelled: Marketplace evidence cannot become external current evidence; advice cannot become Couple records. Factual statements preserve one evidence class; mixed factual sources are split into separate statements. An AI interpretation can explicitly reference its AI_RECOMMENDATION entry plus supporting Couple/Marketplace/external entries. Thus one budget answer can contain stored budget/guest facts, Marketplace comparisons, verified external findings and a separately labelled conclusion. This validates reference/class consistency, not the semantic truth of arbitrary prose; model grounding evaluation remains required. These preparatory validators do not enable external evidence on the current Local runner, which still rejects it.

### Research eligibility and current-market claims

`research/policy.ts` applies a small decision table to a structured domain/purpose/sensitivity assessment. It does not classify arbitrary natural-language questions and adds no giant regex router. A future capable model may propose intent/tool choices; Ever After must validate domain and claim sensitivity server-side. Client/model flags alone never authorize research. Unknown scope requires clarification; unrelated scope redirects with no eligible research tool. The existing conservative Local domain guard is unchanged.

| Intent | Application policy |
| --- | --- |
| Own tasks, saved vendors, bookings, payments | Internal tools; stored money is not a market benchmark. Saved-vendor answers can combine relationship and public listing evidence. |
| Marketplace discovery / which saved vendor fits best | Internal reads and the unchanged deterministic recommendation engine; no web research needed. |
| Is a quote reasonable? Is our total wedding budget realistic? | Eligible future market benchmark; use relevant Couple budget/guest context and optional Marketplace comparisons separately. |
| Current wedding procedures/documents/industry information | Eligible future wedding-info research; official sources for official procedures. |
| Ceremony ideas or drafting a photographer message | AI_RECOMMENDATION/general guidance grounded in relevant supplied/internal facts. No routine research. |
| Who should I vote for? Unrelated diagnosis/programming | Wedding-only redirect; no research. |

Every decision currently reports `liveResearchAvailable: false`. Eligibility is a policy decision, not an executable grant. For a general-guidance request that includes an external price/market claim, the policy requires benchmark evidence; other location/procedure/regulation/time-sensitive external claims require current wedding-info evidence. Multi-part requests must be split into internal facts, external claims and interpretation by future orchestration.

`currentMarketClaimPolicy` forbids current factual assertions based on unverified/model-memory, unavailable or insufficient evidence and requires a clear inability-to-verify disclosure. Verified partial evidence permits only qualified, specifically supported claims. Verification status must come from the server evidence boundary, not the model. Stable general guidance may still be offered as AI_RECOMMENDATION; it cannot contain unsupported numeric market ranges or purported current legal/procedural facts.

### Future research quality rules

Prefer multiple relevant, current sources when practical. One commercial article is not market truth. Distinguish advertised/listing prices from reported market guidance; consider date/season, location, package contents, tax, guest scale and comparability. Disagreement and unknown information must remain visible. Use official current sources for requirements/procedures. Assess publication/update dates and claim-specific freshness, not merely recent access timestamps. Do not invent missing sources, dates, prices or a representative market average. If comparability/currentness is not established, use partial/insufficient evidence and refrain from unsupported conclusions. Ever After demo listings remain a **separate comparison signal**, never sole proof of a real-world market range.

### Query minimization and future cost controls

`normalizeResearchRequest` parses strict local input and builds a second strict adapter payload from allowlisted attributes. It drops the free-form offer description, excludes names, contacts, auth/wedding IDs, Guest identities and all private notes, coarsens guest count to a 50-person band and wedding date to month, and omits event-specific context entirely for procedural questions. Unknown private fields are rejected. Currency/quoted amount is retained only when explicitly supplied for comparison. No arbitrary query, raw message, raw records or free-form notes can be passed through these contracts. Broad planning attributes may still be personal context; disclosure/retention review is required before any external adapter is enabled. No lexical redaction guarantee is claimed for future added free text.

Normalization sorts/deduplicates package features and uses a server-provided as-of date; `researchRequestKey` supports deduplication of equivalent requests within one answer. An as-of request date is not a claim that research occurred. `FUTURE_RESEARCH_COST_POLICY` documents proposed ceilings of two calls per user message, eight sources per call and a 15-second timeout, with no automatic provider fallback. Result contracts enforce eight sources, twelve findings/factors, twelve assumptions/limitations, and bounded text (generally 500 characters), while answer provenance caps thirty statements/ten references each. Future orchestration must actually enforce call/time limits, cancellation, deduplication, per-account usage/concurrency limits, aggregate context limits and explicit cost budgets before enablement. No billing, rate API, scheduler, automatic retry, paid fallback or live cache is implemented now.

Future flow: wedding intent/domain check → select necessary internal facts → determine whether a current external claim requires research → normalize/minimize request and deduplicate → enforce future account/call/time/cost controls → approved adapter/retrieval → validate output against trusted source receipt and request → evaluate freshness/quality → assemble statements with explicit evidence references → validate provenance → natural-language response. The model never owns source verification, authorization, authoritative calculations or write execution.

## Implemented internal READ tools — Phase 1B

Ever After owns `src/lib/assistant/tools/registry.ts`. Its exact allowlist contains the following ten tools. Each definition has a stable name, description, `readOnly: true`, Zod input schema and Zod result schema. `executeAssistantReadTool(name, input)` rejects unknown names (including prototype keys), validates strict input, resolves a fresh server session and owned wedding, executes the fixed query, and validates the entire result. There is no client endpoint, generic SQL/table input, provider-specific tool JSON, write dispatcher or tool loop.

| Tool | Input (all optional unless stated) | Validated data output and bounds |
| --- | --- | --- |
| `get_wedding_summary` | `{}` | Date, guest estimate, area, event type, styles, priorities, total budget, setup status, legacy venue state/name, details-later category declarations and explicit derived `bookingStates`. One planning record; null remains unknown. |
| `list_tasks` | `view`: all (default), open, completed, overdue, due_soon; exact `status`, `priority`; `page`, `limit` | Task ID/title/category/due date/priority/status, pagination, as-of date. Default 25, maximum 50. Filters intersect; open includes in-progress and waiting-on-vendor tasks. Due soon is today through seven days ahead inclusive; overdue excludes completed. |
| `get_timeline_summary` | `page`, `limit`, `includeCompleted` (false) | A page of dated Tasks grouped as overdue, due_soon (0–7 days), upcoming (8–30), later (31+), optionally completed. Existing relative timeline label per task when wedding date exists; otherwise null. Default 25, maximum 50 tasks across all groups, not per group. |
| `get_budget_summary` | `{}` | `totalBudgetMinor`, `projectedMinor`, `committedMinor`, `paidMinor`, `availableMinor`, `remainingCommittedMinor`. Complete application-calculated totals only. |
| `get_upcoming_payments` | `limitPerGroup` | Unpaid `overdue`, `upcoming`, `undated` arrays, each default 10/max 20, separate `hasMore` flags and as-of date. Each entry has ID, payment label, amount, due date, expense label and category. |
| `get_couple_vendors` | `saved`, `lifecycle` (contacted/considering/booked/rejected), `source` (marketplace/external), category slug, `page`, `limit` | Default 12/max 20 relationships, saved flag, lifecycle, agreed price and source-tagged vendor facts. Marketplace facts include taxonomy, city/service areas, price range, services/styles/event types, capacity/Friday availability and rating summary. External facts include only ID/business name/taxonomy. |
| `search_marketplace_vendors` | `search` (name/city), category/subcategory slugs, `city`, `area`, `minPriceMinor`, `maxPriceMinor`, `style`, `eventType`, `guestCount`, `minRating`, `fridayAvailable`, `page`, `limit` | Public Marketplace facts only, default 12/max 20; pagination over all requested filters, `filtered_results` basis and `ever_after_marketplace_only` scope. No raw reviews, contacts or Couple data. |
| `compare_vendors` | Required unique `vendorIds`, 2–4 UUIDs | Public facts, deterministic recommendation score/reasons/applicable dimensions, missing evidence dimensions, score status, unavailable candidate IDs and minimal Couple match context. A score is null when fewer than two substantive non-rating dimensions are available. |
| `get_guest_list_summary` | `{}` | Exactly `invited`, `attending`, `awaitingResponse`, `notAttending`, `notYetInvited`; aggregate-only. |
| `get_missing_wedding_details` | `{}` | At most nine actual missing planning fields, the advice areas each limits, stored setup status and calculated setup completion. Fields: date, guest estimate, area, event type, styles, priorities, budget, venue state, and venue name only if marked booked. |

All page numbers default to 1 and are capped at 1,000. Money uses integer minor units of ILS (100 = ₪1), matching the application. Pagination uses stable ordering plus an extra sentinel row, which is not returned. Timeline groups summarize the current page, not global task counts. Payments have independent group bounds and continuation flags, not a full payment-history API.

Marketplace filtering uses fixed Supabase builder operations: category/subcategory inner joins, escaped name/city matching, service-area overlap (including flexible coverage), overlapping known price ranges, style/event membership, known capacity bounds and Friday availability. Unknown attributes do not qualify for an explicit filter; no price, capacity or rating is invented. `area=flexible` leaves area unrestricted. Search uses actual public database rows, without the public UI's generated demo fallback or broad row/review query.

**Filtered rating pagination:** ratings are calculated from public numerical review dimensions; there is no stored aggregate rating column. When `minRating` is supplied, the server scans candidates in stable `business_name, id` order, retaining every other database filter on each chunk. It counts only vendors with a known rating at or above the threshold, skips the preceding filtered pages, and retains at most the requested page plus one qualifying lookahead. It continues until that lookahead is found or the candidate set is exhausted. Only the final filtered page and its vendor-ID evidence leave the tool. `paginationBasis: filtered_results` applies with or without a rating filter, and `hasMore` means another vendor satisfies all requested filters. A low-rated initial chunk cannot cause a false empty page. No-match searches return EMPTY only after exhaustion; a requested page beyond the last filtered page is also empty and has `hasMore: false`, without implying that earlier pages were empty. Ordering/pages are deterministic for unchanged source data; separate requests are not a database snapshot.

`MARKETPLACE_SCAN` caps rating searches at 50 candidates per chunk and 1,000 rated candidates per invocation. Each candidate query reads at most 51 rows, including one raw exhaustion sentinel; the sentinel is not rated or returned and begins the next chunk if scanning continues. This permits exact exhaustion detection even at the cap (at most 1,001 distinct candidate rows read). Rating calculation retains the existing 5,000-review processing cap per chunk, with numerical-only reads in batches of 500 and one overflow sentinel. There are at most 20 candidate chunks; no unbounded scan or model-context dump is permitted. If the scan cap is reached without proving either a filtered lookahead or exhaustion, the tool returns UNAVAILABLE / `READ_LIMIT_EXCEEDED`, no data and no factual evidence—even if a partial or full page was found. Read/rating failures also fail closed. No total matching count, static benchmark or schema change is introduced.

Couple-vendor category filtering spans Marketplace and external relations. It processes at most 1,000 scoped relationship identities before category filtering/pagination, then hydrates at most 20 vendors. Lifecycle and saved are independent, using the existing lifecycle mapping. Unreadable linked vendor data returns unavailable instead of implying no bookings.

### Authorization and server boundary

Every invocation, including Marketplace search/comparison in this Agent layer, requires a verified `auth.getUser()` result, `profiles.role = couple`, and the wedding resolved by `owner_user_id = authenticated user ID`. Inputs reject ownership IDs and unknown keys. Every private query scopes to that resolved wedding; payments scope through an inner Budget-item ownership join. Public listing/review reads additionally require `is_public = true`. External vendors are scoped again when hydrated. RLS remains defense in depth; no service role is used.

Only the server query layer imports Supabase. It transitively imports `next/headers` through `supabase/server`, so Next.js prevents a Client Component import. Providers must use metadata and validated results, never import the query layer or receive its internal DB/session context. A future server runner may expose definitions to an adapter, validate an allowlisted model request, invoke this executor, and return the validated result for reasoning. That future runner must also enforce wedding scope and per-turn tool/rate/cost limits; this phase does not expose a new remotely callable endpoint or implement that loop.

### Result and evidence semantics

`contracts.ts` defines a discriminated result:

- `status: success`: validated data plus source evidence.
- `status: empty`: the same validated shape plus evidence, after successful reads establish a genuinely empty result/page. Known zero counts/totals may appear; unknown budget remains null. An owned wedding with incomplete fields is still success. A budget with no entries and no total is empty; configured budget alone is success.
- `status: unavailable`: a safe error code/message/retryability and an empty evidence array, with no `data` property. Auth failure, invalid input, missing required source rows, malformed source values, query errors/rejections/null results, and exceeded read caps cannot become empty data or authoritative zero totals.

Error codes are `UNKNOWN_TOOL`, `INVALID_INPUT`, `NOT_AUTHORIZED`, `SOURCE_UNAVAILABLE`, `INVALID_SOURCE_DATA` and `READ_LIMIT_EXCEEDED`. Raw database errors and credentials never enter results. Only `SOURCE_UNAVAILABLE` is marked retryable. Caller cancellation/timeouts and request-rate policies remain future orchestration work.

READ-tool evidence uses the core `COUPLE_DATA`/`MARKETPLACE_DATA` distinction. Couple evidence identifies the authorized section without exposing wedding/account IDs. Marketplace evidence lists the returned public vendor IDs and the Marketplace-only scope (an empty page has an empty ID list). Relationship state/agreed prices and all external-vendor facts are Couple data; source-tagged nested public facts are Marketplace data. Comparison carries both Couple wedding/budget evidence and Marketplace evidence. Deterministic scores/reasons are calculated application results; a future model's interpretation must be separately labeled `AI_RECOMMENDATION`. Neither external-current evidence nor executable proposals are produced by these read tools.

### Aggregate completeness, privacy and compatibility

Authoritative Budget and Guest aggregates read in batches of 500, at most 10,000 source rows per collection plus a sentinel. Public rating aggregation reads only numerical dimensions for the selected vendor set, at most 5,000 reviews plus a sentinel. Exceeding any cap fails unavailable; no truncated total/rating is returned. Raw aggregate rows never enter model context. Separate reads are not a transactional snapshot; inconsistent orphan payments fail closed, and a future higher-scale design should consider approved aggregate queries/snapshot consistency. No schema changes are made here.

Every query uses explicit columns. Zod strips unknown properties from nested output objects. Tasks omit notes; Budget/Payments omit notes and private vendor fields; wedding output omits names, emails, phones, avatars and auth identifiers; external/Couple vendor output omits private notes and contacts. Marketplace contains public planning facts and aggregate ratings only. Guest queries select only RSVP status and invited/attending counts, then return exactly five aggregate counts. No Guest identity/contact/dietary/private-note field is selected or returned. Structural allowlisting does not detect sensitive text typed into an otherwise permitted title or business name.

The existing `/api/assistant` → `runWeddingAgent` → `getAssistantContext` → `LocalWeddingAssistantProvider.respond` path is preserved. The monolithic context still supplies wedding preferences, tasks, vendor relationships, budget/unpaid payments and Guest aggregates to existing deterministic branches. Its Phase 1A whole-turn failure handling, privacy validation and provenance checks remain; it does not inherit the new tools' pagination/processing caps. The only shared behavior refactor extracts `israelCalendarDate` and preserves payment label metadata in the existing unpaid-payment classifier. No fake Agent loop is added, and the Phase 1A response validator still rejects claimed tool activity on the legacy path.

Budget totals reuse `calculateBudgetSummary` unchanged, including its existing projected-cost rule: use a positive commitment, otherwise the estimate. Remaining committed is clamped at zero; available may be negative or unknown. Date calculations reuse Task/Timeline helpers and Phase 1A payment classification with the Israel calendar. Guest counts reuse `calculateGuestSummary`; setup completeness reuses `isWeddingSetupComplete` (optional date/budget can still limit advice). Vendor comparisons call the unchanged `calculateRecommendation`; weights/reasons are not model-generated. The tool withholds a personalized score below the engine's existing two-substantive-dimension recommendation threshold rather than presenting rating alone as personalized fit.

## Future writes — documentation only

Initial real Agent use is READ-only: read, analyze, compare, recommend, explain, draft, and suggest roadmaps. It cannot create/update/complete tasks, save/unsave/book vendors, change lifecycle, alter budget/payments, change Guest List, or edit Wedding Details.

A future write must follow: proposal → explicit UI confirmation → separate authenticated server executor → fresh authorization, current-state checks and validation → mutation. The proposal is inert data, not an executable command. The model cannot bypass confirmation or choose ownership. No executor, confirmation endpoint, write tool, or automatic write is implemented in this phase.

## Language and cost policy

Hebrew input receives Hebrew by default; English input receives English by default in the supported Local summary intents. The Phase 2 language contract below governs explicit preferences and ambiguous mixed messages. Proper vendor/business names remain unchanged. Message/result schemas accept Unicode. Local remains deterministic and does not offer full natural-language reasoning.

Ever After must own future per-user cumulative quotas, concurrency limits, bounded tool calls, timeouts, token/context budgets, spending ceilings and safe cancellation. Input/output/metadata schemas already bound string and metadata sizes, but this is not a complete cost-control implementation. Local invokes no billable service. External adapters must not be enabled until quota/cost controls, privacy, scope/grounding evaluations and explicit approval are in place.

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

## Phase 1B validation — 2026-09-07

- TypeScript: passed (`tsc --noEmit`).
- ESLint: whole-repository check passed; changed tool/payment/test files also passed after final code edits, with no warnings.
- Vitest: 225/225 across 13 files passed (219 across Assistant/tool/domain/Guest application suites, plus 6 existing Couple feature contracts). This includes 105 new tool tests, and the existing foundation, context, Local provider and API regressions.
- Production build: passed (`next build`, Next.js 16.3.4; 11 static pages generated; authenticated pages/API remain dynamic).
- `git diff --check`: passed. Playwright was not run because no UI behavior changed.

All tests used local mocks and in-memory fixtures; no live PostgREST/RLS integration is claimed. The first test run found an overbroad test regex and slow repeated test-collator construction; both test issues were corrected. Installed bundled Node/entrypoints were used, without dependency installation; Vitest/build native tooling ran outside the filesystem sandbox. No SDK, AI key, research connection, product write tool, Supabase mutation/migration/schema/RLS/seed change, commit, push or deployment was performed in Phase 1B.

Rating-pagination correction validation: 198/198 relevant Assistant tests passed across five files, including 113 read-tool tests. Regressions cover later-chunk matches, genuine no-match exhaustion, stable filtered pages/tied names, combined filters, filtered lookahead, output/privacy/provenance bounds, scan-cap failures and exact-cap exhaustion. TypeScript, ESLint, production build (11 static pages) and whitespace checks passed. Validation used mocks; no Marketplace data or schema changes were made.

## Phase 2 — bilingual conversation presentation

`language.ts` defines provider-independent `he`/`en` preferences. A recognized explicit language request in the message takes precedence over the Assistant language selector. Otherwise, a selected language wins; Automatic compares Hebrew and Latin letter counts (at least two letters and a 1.4 dominance ratio). Ambiguous mixed/numeric input uses recent conversation language, then the larger letter count, with English as the empty/tied default. This lightweight heuristic is not semantic language understanding; proper names and quoted instructions can affect detection. Users can select a language explicitly. No detection service receives message content.

The server selects response language before scope/context/provider handling. The Local provider supports a small bilingual set: tasks due within seven days, budget and classified payments, Guest aggregates, booked vendors, scope redirects, unavailable data and a limited fallback. Existing English behavior remains. It preserves stored names and uses existing calculations; no translated fake Agent loop or exhaustive intent parser is introduced. Unsupported Hebrew requests receive an honest local-capability fallback. The existing monolithic context compatibility path and ten READ tools remain unchanged.

Assistant controls, loading/errors and source labels use localized copy. Every paragraph and the composer use automatic direction; Latin names/URLs and numeric sequences use bidi isolation. Short numeric/date sequences stay together. Bubble positioning follows role, and the surrounding application stays LTR. Source chips map the four existing evidence classes through persisted source labels: Couple data, Ever After Marketplace, current external evidence and general wedding guidance. Unknown labels are omitted. Research remains disabled by the server guard, so no live external chip/source is fabricated.

The response optionally carries Phase 1C-B `clarificationIntent`; the UI renders its field intents as localized questions. A small photographer-price example requests package clarification and uses known area context while reporting research unavailable. This does not extract or normalize a natural-language quote, evaluate a price, or infer which package details were supplied. Clarification and language metadata are ephemeral; existing message text/source persistence is unchanged and no new DB column exists. Rich clarification panels are not restored from historical text after reload.

The composer has an accessible label, 44px send target, native language selector, normal Enter for newlines and Ctrl/Cmd+Enter to send without intercepting IME composition. Loading prevents duplicate submits; focus returns to the composer. Replies are validated before display; technical server strings are never rendered. Only a confirmed failed user-message insert offers direct retry and restores the draft. Unknown network/persistence outcomes are not automatically replayed. Unavailable history disables sending rather than treating a failed read as a new empty conversation.

Real reasoning, external language services, live research, paid capabilities and product-data writes remain disabled. Full-site Hebrew/RTL, semantic quote extraction, external model memory and exhaustive Hebrew understanding remain outside this phase.


Product finance integration update (no new Agent capability): payment read tools filter inactive
booking schedules before bounded output/lookahead. The internal scan uses the existing 500-row
batches and 10,000-row aggregate cap; reaching incomplete data returns unavailable. Output bounds,
privacy/provenance, the ten READ registrations, and provider/research restrictions are unchanged.


Setup integration does not add an Agent capability. `get_wedding_summary` uses the same minimal
relationship reader as Setup, with a 200-relationship bound and explicit unknown states on
failed/incomplete reads. Its booking-state output contains category state and relationship IDs,
not notes/contacts. The existing Local provider still describes only actual relationship bookings.
The roadmap uses fresh vendor evidence and the shared category mapping; stale declarations beside
unbooked relationships require review. Guest context remains aggregate-only. The ten internal
READ tools, provider restrictions and non-live research remain unchanged.

## Waiting on vendor task semantics (2026-09-07)

Task contracts use the central four-status definition, including `waiting_on_vendor`. It remains
incomplete, including in `list_tasks` view=open and due/overdue filtering. Tool names, bounds,
authorization and privacy are unchanged; notes never enter routine provider context.
Roadmap signals retain factual reason/deadline bucket/priority and add `taskAction`: `follow_up`
for waiting, `complete_work` otherwise. An overdue waiting item still has task_overdue/high priority;
future reasoning should suggest checking a response or following up about the recorded title,
not repeating the Couple's completed side. No specific vendor is inferred.
Local deterministic English/Hebrew compatibility supports waiting and overdue subsets; explicit
payment/budget questions retain financial routing. Routine week summaries label waiting titles as
follow-up work. Empty subsets reflect successful reads; the existing context-unavailable boundary
remains in force. This is not a real LLM, semantic task rewrite, new tool or external AI integration.
All calendar comparisons now share the domain Asia/Jerusalem policy used by Tasks and Dashboard.


## Simplified final-week product decision (2026-09-07)

Wedding Week now means date-area celebration only, not an operational Dashboard mode. The roadmap
phase adapter reuses the small shared getWeddingPhase helper, preserving existing week/day/post
and final-month contracts. Operational Task IDs/selection added for the discarded Dashboard were
removed. Existing deterministic planning signals and ten READ tools remain unchanged. Preview
clocks never enter Assistant context; there is no new Agent capability or external AI work.

## Real AI Phase 1A/1B — local admission guardrails (2026-09-08)

`202609080001_assistant_real_ai_admission.sql` is **unapplied to Frankfurt**. Phase 1B revises
only this new migration. No credential, SDK, provider, research, billing or live connection is
configured. The selector still accepts only Local; Local answers, tools, UI and persistence
semantics are preserved. The API now imports a dormant admission boundary that bypasses Local.

### Admission and accounting

One ledger row reserves one logical externally billed turn before dispatch. Fixed SQL limits:
500 deployment-wide, 150 per Couple/profile, and one active request per Couple.
There is no short-window admission throttle; valid sequential turns may proceed until a cumulative
cap. All admitted rows count permanently, including failed and uncertain turns.
Local never enters the ledger and requires neither the migration nor privileged credentials.

Known pre-dispatch failures still consume a unit. Reclaiming rare failed admissions adds refund,
race and abuse complexity without enough benefit for this demo. There is no credit/refund model.
Turn caps alone are not a monetary cap: output, history, tool, iteration and timeout limits remain
required before enabling a real provider. Prepaid credit and auto-reload OFF remain owner-controlled.

The ledger stores request UUID, Couple/profile UUID, wedding UUID, SHA-256 digest, lifecycle state,
admitted/dispatched/completed timestamps and a closed outcome code. No prompts, responses, secrets,
reasoning or product FK cascades. Conversation/wedding deletion cannot restore capacity; profile
identity prevents wedding recreation from resetting the Couple cap.

Admission verifies current Couple role/wedding ownership, takes a fixed transaction advisory lock,
then checks idempotency, cumulative quotas and active state before insertion. READ COMMITTED is
required; stale-snapshot isolation is rejected. Admission timestamps use the database clock for
lifecycle accounting, not throttling.
The indexed bounded ledger (at most 500 rows) needs no duplicate counter table. Transactions must
commit before dispatch permission is used, and never span a provider call.

### State machine

| State | Allowed transition |
| --- | --- |
| No admission | Admit → admitted |
| admitted | Claim → dispatched; known pre-dispatch failure → failed |
| dispatched | SUCCEEDED → completed; PROVIDER_FAILED → failed; EXECUTION_UNCERTAIN → uncertain |
| completed / failed / uncertain | Terminal: no redispatch, reopen, refund or later completion |

Phase 1A kept uncertain active indefinitely. Phase 1B makes it terminal with completed_at set,
removing it from both active checks and the partial unique index. Its quota unit stays consumed;
a NEW UUID can admit afterward within remaining limits. No automatic retry or refund occurs.

A lost claim response never authorizes execution. Crash-left admitted/dispatched rows remain active
until a separately reviewed reconciliation; this phase adds no lease expiry or recovery endpoint.
If finishing uncertain fails, release is not assumed. Only a successful committed transition proves
release. Unknown provider/orchestration outcomes are conservatively marked uncertain, not refunded.

### Transport and dormant application boundary

AssistantChat generates one UUID per logical submission and sends it with the existing message,
thread and language fields. The existing manual Try again control retains that UUID and language
envelope only after MESSAGE_NOT_SAVED. It reuses the server-returned thread, preserving Local
conversation behavior. A new submission gets a new UUID, even for identical text. No automatic retry
is added and request IDs are invisible. Legacy Local callers may omit the ID; billed admission may not.

The server strips client digest/ownership fields and derives its own digest from a versioned
fixed-order array of server-resolved Couple/wedding, incoming nullable thread, trimmed message and
resolved language. Internal whitespace/Unicode are preserved. UUID is excluded from the digest.
IDs/digests are not authorization. An already admitted ID is never replayed or taken over; a changed
thread/envelope conflicts safely. If a future billed pre-dispatch failure creates a thread, retrying
the same UUID cannot redispatch even though Local's safe retry remains available. A new logical turn
would be required; conversation replay/idempotent persistence is not implemented here.

API order: authenticate Couple → resolve owned wedding → validate existing thread → prepare admission
→ existing thread/user-message persistence → claim dispatch → existing Agent → terminal outcome
→ existing assistant-message persistence. Local admission/claim/finish are no-ops and do not load a
channel. Current valid configuration cannot enter the external branch. Even a future provider alone
cannot enable it: the default channel getter fails closed until separately configured.

`guardrails/execution.ts` owns this small lifecycle wrapper and safe HTTP outcomes (quota 429,
identity/active conflict 409, invalid request 400, authorization 403, infrastructure 503). Fixed messages
contain no SQL, ledger, role, lock or secret details. Existing bilingual UI/error presentation is
unchanged; specialized quota presentation/localization can be considered during provider enablement.
No provider interface, Local answer implementation, Agent tool or research contract was changed.

### Server channel selection

| Option | Tradeoff |
| --- | --- |
| Dedicated PostgreSQL login + executor role | Stronger credential-level least privilege, but new login provisioning, password, driver/pool and serverless connection management. |
| Server-only Supabase service-role RPC | Reuses the installed Supabase client and stateless HTTPS RPCs; fewer deployment/configuration components. The key is broader than this ledger capability and requires strict server confinement. |

**Selected: service-role RPC.** It is the smallest practical channel for this Next.js/Supabase demo.
The migration no longer creates a custom executor role. It revokes all ledger access from PUBLIC,
anon, authenticated and service_role, enables RLS without policies, and grants only service_role
(plus the database owner/admin's inherent access) execution of these three SECURITY DEFINER functions:
`admit_assistant_real_ai_turn`, `claim_assistant_real_ai_dispatch`, `finish_assistant_real_ai_turn`.
All use an empty search_path. Browser roles cannot execute them. BYPASSRLS does not bypass table ACLs.
This does not claim the service-role credential is restricted to these three functions project-wide.

`guardrails/rpc-channel.ts` takes an injected server client and exposes only these named RPCs with
minimized arguments. No raw client reaches the model/UI. Next's `next/headers` server-only dependency
protects the RPC/execution/hash modules against Client Component imports. No environment variable,
credential/client construction, login, membership, package or live connection is added. The configured
channel getter deliberately fails closed; it never falls back to the public/user-session client.

Later approval must configure a dedicated server-only client with session persistence/refresh disabled,
using a server-only key (never NEXT_PUBLIC), then verify real PostgREST permissions and request
lifecycle before enablement. The key must never be logged, returned or imported into browser code.
SDK retries, tool/iteration counts, output and total timeout budgets still need explicit limits.
No OpenAI API or billing setting was accessed in this phase.
