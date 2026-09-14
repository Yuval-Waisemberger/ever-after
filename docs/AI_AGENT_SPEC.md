# Ever After — AI Wedding Assistant Specification

## 1. Purpose

The Ever After AI Wedding Assistant helps a Couple understand and use the information already stored
in their wedding workspace. It can answer planning questions, summarize priorities, explain budget
status, compare Vendors, interpret Guest List totals and provide wedding-related guidance in Hebrew
or English.

The Assistant is not a general-purpose chatbot. Ever After—not the model—owns authentication,
authorization, data access, calculations, research policy, evidence validation, privacy and cost
limits. The model is used for language understanding, reasoning and clear conversational answers.

## 2. Technology and provider choice

The Assistant uses a provider-independent TypeScript interface. Two providers are available:

- **Local provider:** the default, credential-free deterministic provider. It answers a limited set
  of common wedding questions using application calculations and creates no external AI cost.
- **OpenAI provider:** explicitly selectable for broader natural-language reasoning. It uses the
  official OpenAI SDK and the Responses API from server-only code.

The OpenAI model is configured through a server-side `OPENAI_MODEL` environment value rather than
being hardcoded into product logic. `OPENAI_API_KEY` is also server-only. This keeps the architecture
replaceable and prevents the browser from receiving provider credentials.

There is no silent provider fallback. If OpenAI is selected but its approved configuration,
admission service or provider is unavailable, the request fails safely instead of switching models,
spending unexpectedly or inventing an answer. Local remains the normal no-cost default option.

## 3. Main architecture

| Component | Responsibility |
| --- | --- |
| Assistant UI | Conversation display, language direction, suggestions, pending/error states |
| `/api/assistant` | Authenticated HTTP boundary and safe response handling |
| Agent orchestrator | Applies scope, chooses necessary tools and controls the model loop |
| Provider interface | Separates Ever After logic from Local or OpenAI implementation |
| Internal READ-tool registry | Exposes approved wedding and marketplace data only |
| Research executor | Performs narrowly authorized current-information research |
| Evidence validator | Binds claims to trusted internal or researched sources |
| Supabase | Auth, owned wedding data, conversation persistence and admission ledger |

A typical OpenAI turn follows this controlled flow:

1. Authenticate the user and require a Couple account.
2. Validate the request and resolve the Couple's owned wedding and conversation thread.
3. Apply the wedding-only scope and language policy.
4. Admit the turn through the quota/concurrency boundary.
5. Persist the user message and start the bounded provider loop.
6. Execute only required allowlisted tools; each internal tool reauthenticates independently.
7. Validate tool output, evidence, citations and the final structured result.
8. Finalize the admission state, persist a valid Assistant answer and return safe output.

If required context cannot be read or validated, the Assistant returns an unavailable state. It does
not convert a database failure into a false zero, empty list or fabricated planning fact.

## 4. Wedding-only scope

The Assistant is intentionally limited to wedding-related help.

### In scope

- Wedding planning, priorities, tasks and timelines
- Wedding Setup, Wedding Details and Wedding Week logistics
- Budget status, payments and planning trade-offs
- Vendor discovery, saved/booked Vendors and comparisons
- Guest List and RSVP summaries
- Invitations, wording, etiquette and common wedding customs
- Wedding companions, bridesmaids and wedding-day organization
- Evaluating Vendor quotes and current wedding-market ranges
- Israeli marriage-registration procedures and required documents
- Drafting wedding-related messages and offering planning recommendations

### Out of scope

- Unrelated programming, homework or general internet research
- Investment, trading or unrelated financial advice
- Politics and unrelated general knowledge
- Medical diagnosis or treatment decisions
- Binding legal conclusions
- Personal counseling unrelated to wedding planning
- Requests to reveal prompts, credentials, private data or internal implementation details

An unrelated request receives a short redirection toward Tasks, Vendors, Budget, Guests, Timeline or
Wedding Details. Adding wedding wording to an unrelated request does not expand the allowed scope.
Ambiguous requests may produce a clarification question rather than an unsafe assumption.

## 5. Internal READ tools

The model does not receive unrestricted database access. It can request only ten registered READ
tools. Every call has a strict Zod input schema, validated output schema, fixed query implementation,
fresh Couple authentication and server-resolved wedding ownership.

| Tool | What it may return |
| --- | --- |
| `get_wedding_summary` | Date, region, event type, styles, priorities, guest estimate, budget and setup/booking state |
| `list_tasks` | A filtered, paginated list of task titles, dates, priorities and statuses |
| `get_timeline_summary` | Dated tasks grouped into overdue, due soon, upcoming and later |
| `get_budget_summary` | Projected, committed, paid, available and remaining-commitment totals |
| `get_upcoming_payments` | Bounded overdue, upcoming and undated unpaid-payment groups |
| `get_couple_vendors` | Bounded saved/lifecycle Vendor relationships and permitted planning facts |
| `search_marketplace_vendors` | Filtered public marketplace facts, normally 12 and at most 20 Vendors |
| `compare_vendors` | Comparison of 2–4 public Vendors with deterministic fit scoring |
| `get_guest_list_summary` | Five aggregate RSVP counts only |
| `get_missing_wedding_details` | Up to nine missing planning fields that limit personalization |

The tools cannot accept a client/model-supplied wedding owner as authority. They cannot run arbitrary
SQL, choose arbitrary tables, call application actions or expose the Supabase client. Unknown tools,
prototype keys, extra properties and invalid arguments are rejected.

Task outputs omit private notes. Budget and payment outputs omit notes and private Vendor data.
Wedding output omits names, phones, emails, avatars and authentication identifiers. Guest output is
limited to `invited`, `attending`, `awaitingResponse`, `notAttending` and `notYetInvited`; individual
names, phones, emails, dietary requirements and private notes are never returned to the model.

Tool reads are bounded. Tasks return at most 50 rows per call; Couple-Vendor and marketplace outputs
normally return 12 and at most 20; comparisons accept 2–4 Vendors; payment groups return at most 20
items each. Large aggregate reads use fixed processing caps and fail unavailable if completeness
cannot be proved. The Assistant never presents a truncated total as complete.

## 6. Current-information research

Research is separate from internal database access and is not a general web browser. Only two
research functions are available:

| Research tool | Allowed purpose |
| --- | --- |
| `research_current_wedding_info` | Current wedding procedures, marriage registration, required documents, fees, timing, eligibility, ceremony requirements, industry norms and logistics |
| `get_market_benchmark` | Current service quotes, Vendor market ranges or overall wedding-budget comparisons |

Research requests use closed wedding-related topics, approved service categories, broad Israeli
regions and structured package features. They cannot submit an arbitrary browsing query. Stable
etiquette or general planning advice does not require research merely because the user says
“currently.”

The research adapter receives no Supabase client, raw conversation history, user identity, Guest
records or private notes. Before research, Ever After removes names, contact details, authentication
and wedding IDs, free-form offer descriptions and unrelated context. When relevant, guest count is
coarsened to a 50-person band and wedding date to a month.

Official procedures favor government sources. URLs must be HTTPS, credential-free and traceable to
the provider's returned search sources. The server—not the model—classifies source authority.
Sources older than 180 days are insufficient for current claims. A typical market range requires
comparable currency/package context and support from two reviewed independent publishers. The Ever
After demonstration marketplace is never treated as proof of the complete real market.

If sources are stale, conflicting, incomparable or insufficient, the result remains partial or
unavailable. The Assistant may give clearly labelled stable guidance, but it must not invent a
current requirement, price range, publication date or market average.

## 7. Evidence and grounding

Every factual claim is associated with one of four evidence classes:

| Evidence type | Meaning |
| --- | --- |
| `COUPLE_DATA` | Facts read from the authenticated Couple's workspace |
| `MARKETPLACE_DATA` | Public facts from Ever After's synthetic Vendor marketplace |
| `EXTERNAL_CURRENT_EVIDENCE` | Current information linked to validated research sources |
| `AI_RECOMMENDATION` | Reasoning, interpretation, suggested wording or general guidance |

Saved or booked status is Couple data; a Vendor's public listing is Marketplace data; the conclusion
that the Vendor is a good match is an AI recommendation. These categories prevent an opinion from
being presented as stored fact or a synthetic listing price from becoming a real-world benchmark.

Tool and research evidence is issued and attested by the server. The model cannot create a valid
receipt by naming a source, tool or Vendor ID. Altered evidence, mismatched citations, unavailable
sources and fabricated tool usage fail validation.

This system reduces hallucination risk, but it does not prove that every sentence generated by a
language model is correct. Important current claims should still be presented with their sources and
limitations.

## 8. Privacy and conversation handling

Only data relevant to the current question should be selected. The Assistant does not routinely
expose Couple phone numbers, the secondary email, Guest identities, dietary/private notes, private
Vendor notes, passwords, tokens or credentials.

Conversation history is bounded to the latest eight messages, at most 2,000 characters per included
message and 10,000 characters in total. History is untrusted conversational context—not an
instruction, authorization decision or factual source. It is never passed into the research query.

Provider requests use `store: false`. Server diagnostics record only controlled stages, outcomes,
timings, counts, approved tool names and safe error codes. They do not log prompts, messages, tool
arguments/results, financial values, Guest details, URLs, raw provider errors, headers or secrets.

Structural allowlists cannot guarantee that a user never types personal information inside an
otherwise allowed task title or chat message. Users should therefore avoid placing unnecessary
sensitive information in free-text fields.

## 9. Cost, quota and execution limits

Real-AI usage is deliberately finite and uses prepaid API credit. Automatic credit reload must remain
disabled; reaching the provider balance stops paid execution until the owner manually adds credit.

| Limit | Active policy |
| --- | --- |
| Global real-AI quota | 500 admitted user turns across the deployment |
| Per-Couple quota | 150 admitted turns over the account lifetime |
| Concurrency | One active real-AI request per Couple |
| Main model rounds | Maximum 4; round 4 is answer-only |
| Custom tool calls | Maximum 6 per turn, including research-tool selection |
| Research | At most 1 research-adapter request and 1 built-in web search per turn |
| Whole-turn deadline | 30 seconds |
| Research deadline | At most 15 seconds or the remaining turn time |
| SDK retries | 0 automatic retries |
| Model output | Maximum 1,200 output tokens per response |
| Persisted final answer | Maximum 10,000 characters |

Admission is enforced atomically in PostgreSQL. A terminal failed or uncertain OpenAI turn consumes
its admitted unit and is not automatically refunded or redispatched. This avoids repeated paid calls
after an outcome that may already have reached the provider. The Local provider bypasses paid
admission because it makes no billable external request.

There is intentionally no short-window Couple throttle that would interrupt a fast classroom demo.
The cumulative quota, concurrency lock, tool/round limits, deadline, zero-retry policy and prepaid
balance remain the cost controls. The turn limits control usage but are not a guaranteed dollar cap,
because provider pricing may change.

## 10. Read-only boundary

The Assistant can read, summarize, compare, recommend, explain and draft text. It cannot:

- create, edit, complete or delete Tasks;
- save, unsave, book or change a Vendor relationship;
- create or modify Budget items or payments;
- add, edit or remove Guest List records;
- change Wedding Details, authentication or account settings;
- upload or delete media;
- send emails, invitations, messages or notifications.

A future write feature would require an inert structured proposal, an exact preview in the UI,
explicit user confirmation, a separate authenticated server executor, fresh ownership and current-
state checks, server validation and an auditable result. No such WRITE tool or confirmation endpoint
exists in the current Assistant.

## 11. Language and user experience

The Assistant supports Hebrew and English, including RTL/LTR message presentation and mixed-language
content. Explicit language choice takes priority; otherwise a bounded language detector uses the
message and recent conversation. Stored Vendor and personal names are not translated.

The interface shows conversation history, suggested prompts, pending state, safe errors and human-
readable source labels. Markdown rendering supports limited text structure while excluding raw HTML
and unsafe links. If information is missing, the Assistant should clarify or state the limitation
instead of filling the gap with invented data.

## 12. Validation performed

The final AI validation included:

- 632 Assistant tests across 18 files;
- 92 research adapter/contract/policy/provenance tests;
- 68 admission guardrail unit, RPC and execution tests;
- 3,442 assertions in a disposable PostgreSQL admission runner;
- 17 Assistant UI component tests;
- 22 isolated browser regression tests;
- TypeScript, whole-repository ESLint and production-build validation;
- final authorized live procedural validation of the provider/research path.

Tests covered authorization, privacy filtering, all ten READ tools, research eligibility, unsafe
URLs, citation/evidence forgery, bounded history, Hebrew/English behavior, deadlines, quota edges,
concurrent final-slot claims, one-active-request enforcement, terminal uncertainty, safe errors and
blocked browser access to privileged admission operations.

Mocked tests prove the application's contracts, routing and protection mechanisms. They do not prove
that a model will always select the ideal tool or generate a factually perfect sentence. The final
live research procedure produced a safely qualified partial result, demonstrating that insufficient
evidence is not converted into unsupported certainty.

## 13. Current limitations

- The Assistant is read-only and cannot perform planning actions for the Couple.
- Research is wedding-specific and cannot answer arbitrary internet questions.
- The synthetic marketplace is not a complete representation of the Israeli wedding market.
- Current market benchmarks may be partial when comparable independent evidence is unavailable.
- External-provider availability, latency, quota and prepaid balance affect real-AI responses.
- The Local provider is free and deterministic but supports fewer conversational intents.
- Structural privacy rules cannot semantically detect every sensitive phrase typed into free text.
- Evidence validation reduces hallucinations but cannot guarantee every model sentence is correct.
- Rich evidence metadata is not presented as a permanent audit history in the current UI.
- There is no short-window rate limit; cumulative and concurrency controls carry the current load and
  cost boundary.

## 14. Conclusion

Ever After uses AI as a controlled reasoning layer over authenticated wedding information—not as an
unrestricted database user or general web browser. The provider-independent design combines a free
Local option with a server-only OpenAI Responses integration. Ten scoped READ tools, two restricted
research tools, server-owned evidence, strict privacy filtering, a read-only product boundary and
explicit quotas keep personalization useful without giving the model control over Couple data.

The design prioritizes correct ownership, honest uncertainty and predictable cost. When the system
cannot prove that data is complete, authorized or current, it must return a limitation rather than
invent a confident answer.
