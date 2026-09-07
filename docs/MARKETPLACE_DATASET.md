# Marketplace Demo Dataset

The Marketplace is fictional university-demo content. Business identities, descriptions, contacts,
prices, ratings and reviews are synthetic, not claims about real suppliers or current market prices.
Marketplace observations must not be presented by the Assistant as representative market benchmarks.

## Current inventory

**496 vendors, 8 top-level categories, 27 subcategories, 2,727 reviews.**

| Category | Vendors | Subcategories |
| --- | ---: | ---: |
| Venues | 36 | 1 |
| Photography & Content | 88 | 4 |
| Music & Entertainment | 66 | 3 |
| Beauty & Attire | 66 | 3 |
| Design & Flowers | 88 | 4 |
| Event Services | 88 | 4 |
| Cakes & Desserts | 32 | 4 |
| Wedding Accessories & Party Extras | 32 | 4 |

Stable IDs/slugs identify vendors independently of display-name changes. Generator/tests check
unique identities, normalized names, taxonomy, descriptions, image references and rating consistency.

## Generator and database

scripts/generate-marketplace-seed.mjs is the maintained synthetic-data source. It generates
supabase/seed.sql and src/generated/marketplace-demo.json together. The JSON supports disconnected
public preview and deterministic tests; connected Marketplace reads published Supabase records.
Run pnpm seed:check for read-only consistency or pnpm seed:generate for intentional local regeneration.
Neither command applies SQL. The seed is for approved development/demo setup, not live QA.

## Runtime images and provenance

There are **291 distinct tracked runtime WebPs** under public/demo-marketplace: **227 pooled/legacy
assets** plus **64 dedicated primary images** for the 64 newer vendors. All 496 vendors have a
primary mapping and one matching gallery/image row. Reuse by older vendors is intentional; no
runtime file is unused. Every image is an optimized 1200×900 WebP. Some stable image paths include
a content-hash query suffix to invalidate cached earlier versions.

The pool combines approved generated editorial images and user-supplied approved imagery, processed
into runtime WebPs. Raw PNG/JPG inputs, contact sheets and generation prompts are not runtime
requirements. The newer batch selected 64 distinct images from 68 supplied inputs; four similar
inputs were deliberately excluded. Each selected image maps to its stable vendor slug as
<vendor-slug>-primary.webp. Eight dedicated images exist in each of: wedding-cakes, dessert-tables,
pastry-patisserie, custom-sweets, dance-floor-accessories, glow-accessories,
guest-comfort-accessories and party-props-giveaways.

The final WebPs must remain tracked so Vercel can serve them. No remote image host is needed for
the demo catalog. Real Vendor-account uploads use the separate Supabase Storage architecture.
No three-image gallery expansion has been implemented; the single-primary gallery is intentional.

## Historical Frankfurt expansion

A separately approved manual data delta was applied on 2026-09-06 to wedding-planner-project-eu,
eu-central-1. It expanded the existing catalog from 432 to 496 vendors, adding two categories,
eight subcategories, 64 primary images and 344 reviews, plus five approved existing display-identity
corrections. Existing UUIDs/slugs were preserved. It was a historical data operation, not a schema
migration or ongoing setup command. **Do not rerun that delta blindly.** The current generator/seed
already represent its final data. Original reports and the applied delta are retained only as ignored
local references; neither application nor tests depend on them.

## Verification

The approved read-only inventory verified all 496 public Frankfurt primary rows resolve to 291
tracked local paths, including all 64 dedicated primaries; none were missing or untracked. Local
seed tests and browser specs independently validate current mappings and image decoding. These
checks do not justify deleting pooled images or treating fictional price bands as current research.
