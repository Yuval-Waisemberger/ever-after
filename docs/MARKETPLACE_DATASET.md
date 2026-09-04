# Marketplace Demo Dataset

## Purpose and source of truth

The marketplace data is deterministic, synthetic university-demo content. Vendor business names,
contacts, descriptions, package combinations, ratings, and review text are fictional. Public market
research informed only category terminology and broad ranges; the dataset does not reproduce real
vendor profiles or reviews.

`scripts/generate-marketplace-seed.mjs` is the maintainable data generator. One run produces the SQL
and fallback JSON together and validates their references to the checked-in image pool:

- `supabase/seed.sql`, the database seed and intended connected-environment source of truth;
- `src/generated/marketplace-demo.json`, the no-credential read-only fallback;
- `public/demo-marketplace/<subcategory>/*.webp`, a curated pool of 198 local demo photographs.

The data generator does not regenerate photographs. The WebPs are static project assets; image
selection/provenance and the deterministic mapping rules are documented in `DEMO_IMAGE_POOL.md`.

Run `pnpm seed:generate` after editing the generator and `pnpm seed:check` in validation/CI. The SQL
uses fixed UUIDs, fixed review dates, one transaction, and upserts for categories, subcategories,
vendors, images, and reviews. Repeating the same seed does not duplicate rows and never deletes
user-owned marketplace relationships.

## Exact size and distribution

The generated catalog has 432 vendors and 2,383 reviews (including two owner-approved additional
Ein Kerem Terrace (formerly South Estate House) reviews and one high North Photography Workshop review). High-level totals are Venues 36,
Photography & Content 88, Music & Entertainment 66, Beauty & Attire 66, Design & Flowers 88, and
Event Services 88. Wedding Venues & Gardens has 36 vendors; each of the remaining 18 detailed
subcategories has exactly 22.

Home bases are Central Israel 123, Sharon 80, North 78, Jerusalem 74, and South 77 (including the
owner-reviewed venue, Lark/North Photography and Mosaic Films location corrections). Mobile vendors
cover multiple regions, while 34 are explicitly nationwide/flexible. Venue rows have a physical city,
50–340 minimum capacity, varied maximum capacity, indoor/outdoor flags, Friday suitability, event
types, and per-guest pricing. Other types carry category-specific service combinations and packages.

Review counts deliberately vary: 24 vendors have none, 84 have one or two, 235 have three to seven,
57 have eight to twelve, and 32 have thirteen or more. Aggregate rating bands are 24 unrated,
111 mixed (below 4.0), 211 positive (4.0–4.49), and 86 highly rated (4.5–5.0). Each written review is
composed from that vendor's actual services/style and its four integer rating dimensions; the
choose-again value is derived consistently from those dimensions.

Dataset tests calculate the exact counts and distributions directly from the generated marketplace
JSON so a second derived statistics file cannot drift from the runtime fallback.

## Synthetic price bands

Amounts are stored as agorot. Venues span ₪220–₪700 per guest. Package/service bands span:
photographers ₪6,500–₪18,500; video ₪4,500–₪13,500; magnets ₪1,200–₪3,200; social content
₪1,800–₪5,500; DJs ₪4,000–₪11,000; attractions ₪1,800–₪10,000; booths ₪1,500–₪4,500;
dresses ₪2,500–₪18,000; suits ₪1,200–₪10,000; makeup/hair ₪1,500–₪5,500; event design
₪3,000–₪25,000; flowers ₪1,500–₪20,000; invitations ₪500–₪4,500; favors ₪800–₪7,000;
transport ₪900–₪5,000; officiants ₪800–₪4,500; event management ₪1,500–₪6,500; and
preparation locations ₪1,200–₪9,000. Four overlapping tiers in each type create budget, mid-range,
premium, and higher-end comparison cases.

## Public research basis

Research was used as orientation, not copied vendor data. Sources included broad Israeli wedding
budget breakdowns from [Count](https://count.co.il/finansim/machshevon-taktziv-chatuna),
[Wedly](https://www.wedly.co.il/tools/wedding-budget-calculator), and
[N12](https://www.mako.co.il/news-specials/data_n12/Article-d63f6b035bc1791026.htm); venue and
photography price-list examples from [Dapei Zahav venues](https://www.d.co.il/priceList-990/) and
[Dapei Zahav photographers](https://www.d.co.il/priceList-42450/); beauty service factors from
[Midrag](https://www.midrag.co.il/Content/Price/12222); transport package factors from
[Midrag transportation](https://www.midrag.co.il/Content/Tip/10492); and floral/design components
from [Erez Flowers](https://erez-flowers.co.il/wedding-floral-design-cost/) and
[Violet Flowers](https://violetflowers.co.il/guides/wedding-flowers-guide). Actual generated values,
identities, reviews, and claims remain wholly synthetic.

## Demo-feature support

- Search has distinct business names, city names, descriptions, and category-specific services.
- Browsing has all 19 source-of-truth subcategories and enough rows for multiple 12-item pages.
- Filters receive overlapping but non-identical area, price, capacity, Friday, rating, and service data.
- Recommendations can distinguish profiles through area, four price tiers, 13 approved wedding
  styles, venue capacity, event types, and varied review-derived ratings.
- Budget compatibility can exercise clear fit, partial-fit, and over-budget paths.
- Assistant comparison receives concrete services, price bands, locations, styles, ratings, and
  varied review evidence instead of name-only duplicates.
- Images have no runtime dependency on Unsplash or another host. The 198 optimized WebPs are grouped
  by the 19 detailed subcategories and deterministically reused across 432 vendors. All pooled files
  are used at least once. Venue assignments additionally reserve the Jerusalem, Tel Aviv, coastal,
  garden, and indoor-hall anchors for compatible fictional locations. These checked-in assets deploy
  with Next.js/Vercel and coexist with the unchanged Supabase Storage path for future Vendor uploads.

The controlled September 2026 visual update gives Wedding Photographers, Videographers and Magnet
Photographers 22 distinct primary covers each, preserves every ID/slug, and replaces the repetitive
venue-name template with varied display names. See `MARKETPLACE_VISUAL_REVIEW.md` for the full
name mapping, explicitly requested data exceptions, asset counts and validation evidence.
