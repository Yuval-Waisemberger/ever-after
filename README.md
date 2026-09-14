# Ever After

**Plan every part of your wedding in one shared place.**

Ever After is a responsive wedding-planning platform that brings wedding details, tasks, vendors,
budget commitments, payments, guests, reviews, a timeline, and personalized guidance into one
coherent workspace.
The product combines three connected experiences: a public vendor marketplace, a private planning
workspace for couples, and a self-service workspace for wedding vendors.
Ever After was developed as a comprehensive academic full-stack project,
with a production-oriented architecture and room for future expansion.

## What you can do

### Couples

- **Set up your wedding** with its date, location, guest estimate, budget, style, priorities, and
  current planning status. Setup is optional and can be completed or changed later.
- **See the whole plan at a glance** in Our Wedding, including the countdown, open tasks, vendors,
  budget, payments, and guest summaries.
- **Manage tasks and deadlines** with categories, priorities, statuses, notes, and dates. Dated tasks
  automatically appear in the Wedding Timeline.
- **Explore and manage vendors** by searching the marketplace, viewing public profiles and reviews,
  saving businesses, tracking booking status, or adding an external vendor.
- **Receive personalized recommendations** based on available Wedding Details and transparent,
  deterministic matching rules.
- **Track the budget and payments** across manual expenses and booked-vendor commitments. Ever After
  records payment status but does not transfer money.
- **Manage guests and RSVPs** and keep aggregate attendance information in the same workspace.
- **Write vendor reviews** and manage the reviews created by the Couple account.
- **Ask the Wedding Assistant** wedding-related questions in Hebrew or English using relevant,
  permitted planning context.

### Public visitors

- Browse, search, and filter published businesses in the wedding-vendor marketplace.
- Open public vendor profiles to view services, galleries, business information, and approved
  reviews without creating an account.

### Vendors

- Create a Vendor account and maintain one owned business profile.
- Manage public business details, services, attributes, service areas, pricing information, gallery,
  and publication status.
- View profile-completion information, rating summaries, and reviews received from Couples.
- Browse the public marketplace without gaining access to another Vendor's management data or a
  Couple's private planning information.

**The marketplace uses synthetic demonstration data and is not presented as a complete or current**
**representation of the Israeli wedding market.**

## Wedding Assistant

The Assistant is a controlled, read-only reasoning layer over Ever After's authenticated wedding
data. It can explain priorities, summarize tasks or budget status, compare vendors, interpret guest
totals, and provide wedding guidance without changing the Couple's records.

The Wedding Assistant uses a secure, server-side OpenAI integration for natural-language reasoning.
It accesses relevant wedding information through ten scoped READ tools and two restricted research tools,
without changing the Couple's records or exposing provider credentials to the browser.

## Built with

Ever After is built with Next.js, React, TypeScript, and Tailwind CSS; Supabase Auth, PostgreSQL with Row Level Security,
and Storage handle accounts, data, permissions, and vendor galleries.
The app uses Zod for server-side validation, Vitest and Playwright for automated testing, and runs on Vercel.
The Wedding Assistant uses the OpenAI Responses API through a secure server-side integration.


## Run locally

You need Node.js **24.x** and pnpm **11.19.0**. Use the package-manager version declared in
`package.json`.

```bash
git clone https://github.com/Yuval-Waisemberger/ever-after.git
cd ever-after
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000/).

To use the authenticated Couple, Vendor, and Wedding Assistant features locally, configure the required environment variables
in `.env.local` and apply the repository migrations to a Supabase project. Never commit `.env.local` or secret values to source control.

### Environment variables

| Variable | Required for | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Connected Auth and database features | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connected Auth and database features | Browser-safe |
| `NEXT_PUBLIC_SITE_URL` | Authentication callback and recovery URLs | Browser-safe |
| `AI_PROVIDER` | Selecting the configured Assistant provider | Server |
| `OPENAI_API_KEY` | Real-AI responses | Server-only |
| `OPENAI_MODEL` | Real-AI model selection | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Protected real-AI admission operations | Server-only |

The application does not silently switch providers.

## Tests

```bash
pnpm test   # Maintained Vitest tests
pnpm check  # Seed consistency, ESLint, TypeScript, Vitest, and production build
```

The project also includes Playwright browser tests and disposable PostgreSQL tests. The browser
suites cover public, authentication, Couple, Vendor, Assistant, budget, tasks, setup, and
date-driven wedding flows. The database tests verify migrations, constraints, triggers,
transactions, and Row Level Security without modifying live data.

See the [testing guide](docs/TESTING.md) for the complete test setup, individual commands, and
documented limitations.

## Documentation

| Guide | Contents |
| --- | --- |
| [Product specification](docs/PRD.md) | Product problem, users, goals, capabilities, flows, and success criteria |
| [Software architecture](docs/ARCHITECTURE.md) | System structure, routes, data ownership, integrations, and deployment topology |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Project structure, components, CRUD behavior, business rules, validation, and UX design |
| [Wedding Assistant specification](docs/AI_AGENT_SPEC.md) | Provider loop, scoped tools, research, evidence, privacy, quotas, and limitations |
| [Security](docs/SECURITY.md) | Authentication, authorization, RLS, secrets, storage, and Assistant safeguards |
| [Scalability](docs/SCALE.md) | Current scale, query growth, indexes, pagination, and future improvements |
| [Testing](docs/TESTING.md) | Test strategy, feature coverage, recorded evidence, and remaining checks |



Built by [Yuval Waisemberger](https://github.com/Yuval-Waisemberger) and Liat Ben Shabat for the **Full-Stack** course.
