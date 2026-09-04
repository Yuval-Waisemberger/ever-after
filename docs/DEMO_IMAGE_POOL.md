# Local demo image pool

The marketplace uses **227 local WebPs** under `public/demo-marketplace/<subcategory>/`.
Every file is 1200 × 900 (4:3). The complete pool is 28,690,832 bytes (27.36 MiB), averaging
126,391 bytes per image; the range is 42,864–301,542 bytes. Small simple images are intentionally
not padded to reach a target size. There are no exact duplicate files.

## Targeted realism pass — 4 September 2026

Added 29 originals; all 198 previous runtime files remain byte-for-byte unchanged and all 227 files are used.
The nine targeted subcategories use twelve-cover sequences, combining suitable existing shots with additions.
Photography/video/magnets retain their 22 distinct covers each; venue assignments remain unchanged.
Intentional reuse remains on later pages and in lower-priority categories: uniqueness is not a global requirement.
See `TARGETED_MARKETPLACE_IMAGE_AUDIT.md` for counts, residual repetition and validation, and
`TARGETED_IMAGE_PROMPTS.md` for the exact generation prompts and preserved original paths.
The sections below record earlier asset provenance and edits; historical counts are not the current total.

## Juniper magnet orientation correction

The owner requested a precise edit of `magnet-photographers/magnet-photographers-08.webp`:
the guests must look at the printed sides, while the camera sees the dark magnetic backs.
The built-in imagegen tool edited this single image; no API/paid-service fallback was used.
The optimized replacement is 75,644 bytes (previously 82,966), at the same 1200 × 900 size.
The original is preserved in ignored `.codex-tmp/juniper-before.webp`. The pool stays at 198.
A deterministic content-hash query refreshes Juniper's card and profile without changing its identity.

Final prompt:

> Use case: precise-object-edit. Image 1 is the edit target: a photorealistic wedding reception image of two guests holding small photo magnets. Correct only the orientation of BOTH small photo magnets: the printed photograph faces must face toward the guests' eyes, NOT toward the camera. From this front-facing camera viewpoint we should see plain matte dark charcoal magnetic BACKS on BOTH rectangles, no photographs or writing visible on their camera-facing sides. Preserve the thin rectangular magnets, natural grip and realistic fingers. Keep both people, faces, delighted downward gazes, clothes, pose, framing, warm reception lighting, background, colors and 4:3 composition unchanged. No extra props, text, logo or watermark. The physical logic must be clear: they are admiring the photographs on the inward-facing sides while we see their blank magnetic backs.

## Recovery and selection

All 110 previously completed staged PNGs survived and decoded successfully. One additional completed
`event-design-01.png` was recovered from the interrupted generation output. The initial replacement pool contained
86 retained earlier sources, that recovered design image, 48 targeted new sources, and 27 exact
user-approved assets. Original PNG/JPEG sources remain untouched in ignored `.codex-tmp` folders.

The six explicitly rejected staged sources are excluded: `wedding-venues-03`,
`wedding-photographers-02`, `videographers-03`, `videographers-06`, `magnet-photographers-02`,
and `photo-booths-06`. They are not runtime assets.

Additional earlier sources excluded in favor of stronger approved assets:

- Venues: 05, 06, 09, 10, 14, 16, 21, 24, 27, 29 (foreign-looking, overly similar, or less suitable).
- Wedding photographers: 04, 06 (repetition/foreign-looking coastal setting).
- DJs: 01, 07 (similar compositions replaced by approved evening photographs).
- Wedding dresses: 02; suits: 05, 08; makeup/hair: 07 (approved individual/preparation imagery improves variety).

No source images were deleted from the ignored staging areas. Runtime crops were reviewed on contact
sheets for category identity, anatomy, objects, logos, repetition, and composition.

Exact retained earlier source numbers (relative to each staging subcategory folder):

- Wedding venues: 01, 02, 04, 07, 08, 11, 12, 13, 15, 17, 18, 19, 20, 22, 23, 25, 26, 28, 30, 31, 32, 33, 34, 35, 36.
- Wedding photographers: 01, 03, 05, 07; videographers: 01, 02, 04, 05, 07.
- Magnet photographers: 01, 03, 04, 05, 06; social content: 01–06.
- DJs: 02–06; attractions: 01–07; photo booths: 01–05.
- Wedding dresses: 01, 03–10; suits: 01–04, 06, 07, 09; makeup/hair: 01–06, 08, 09.

## Pool counts

| Group | Detailed pool | Images |
| --- | --- | ---: |
| Venues (36) | Wedding venues/gardens | 36 |
| Photography & Content (66) | Wedding photographers / videographers / magnets / social content | 12 / 22 / 22 / 10 |
| Music & Entertainment (27) | DJs / attractions / photo booths | 12 / 7 / 8 |
| Beauty & Attire (33) | Wedding dresses / suits / makeup & hair | 12 / 9 / 12 |
| Design & Flowers (37) | Event/chuppah design / flowers / invitations / guest gifts | 8 / 10 / 12 / 7 |
| Event Services (28) | Transportation / officiants / event managers / preparation hotels | 5 / 5 / 6 / 12 |

## Exact user-approved assets incorporated in the initial replacement

Source paths below are relative to `.codex-tmp/user-approved-images`. Runtime paths are relative to
`public/demo-marketplace`; they were normalized copies, not regenerated imitations. Following the
subsequent venue feedback below, images 28, 30 and 33 are edited replacements; the other 24 remain exact
approved source copies (resized/cropped/compressed). All originals remain untouched.

| Original source | Runtime WebP |
| --- | --- |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_50_12 PM.png` | `makeup-hair/makeup-hair-09.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_50_27 PM.png` | `suits/suits-08.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_50_46 PM.png` | `transportation/transportation-01.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_52_10 PM (1).png` | `wedding-photographers/wedding-photographers-05.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_52_10 PM (2).png` | `wedding-photographers/wedding-photographers-06.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_52_10 PM (3).png` | `wedding-dresses/wedding-dresses-10.webp` |
| `bride & groom/ChatGPT Image Sep 3, 2026, 07_52_10 PM (4).png` | `suits/suits-09.webp` |
| `DJ/ChatGPT Image Sep 3, 2026, 07_49_45 PM.png` | `djs/djs-06.webp` |
| `DJ/ChatGPT Image Sep 3, 2026, 07_52_10 PM (7).png` | `djs/djs-07.webp` |
| `flowers and decorations/ChatGPT Image Sep 3, 2026, 07_50_31 PM.png` | `flowers/flowers-01.webp` |
| `flowers and decorations/ChatGPT Image Sep 3, 2026, 07_50_38 PM.png` | `invitations/invitations-01.webp` |
| `flowers and decorations/ChatGPT Image Sep 3, 2026, 07_52_10 PM (5).png` | `invitations/invitations-02.webp` |
| `flowers and decorations/ChatGPT Image Sep 3, 2026, 07_52_10 PM (8).png` | `flowers/flowers-02.webp` |
| `flowers and decorations/IMG_0049.JPG` | `flowers/flowers-03.webp` |
| `photography/ChatGPT Image Sep 3, 2026, 07_49_15 PM.png` | `wedding-photographers/wedding-photographers-07.webp` |
| `photography/ChatGPT Image Sep 3, 2026, 07_52_10 PM (6).png` | `magnet-photographers/magnet-photographers-06.webp` |
| `venues/, חופה בחוץנוף הרים, טבעי, ירושלים.png` | `wedding-venues/wedding-venues-26.webp` |
| `venues/ChatGPT Image Sep 3, 2026, 07_55_44 PM.png` | `wedding-venues/wedding-venues-27.webp` |
| `venues/אולם אירועים מרכז וצפון, הרבה ירוק.png` | `wedding-venues/wedding-venues-28.webp` |
| `venues/אולם ערב ישראלי.png` | `wedding-venues/wedding-venues-29.webp` |
| `venues/אולם ערב.png` | `wedding-venues/wedding-venues-30.webp` |
| `venues/וויבים של ירושלים, אותנטי, מבני, טבעי.png` | `wedding-venues/wedding-venues-31.webp` |
| `venues/מרכז, גן אירועים, טבע גינה.png` | `wedding-venues/wedding-venues-32.webp` |
| `venues/נבורישי מאוד, אולם ערב, נתניה, ראשון....png` | `wedding-venues/wedding-venues-33.webp` |
| `venues/נוף ים, קיסריה, חוץ.png` | `wedding-venues/wedding-venues-34.webp` |
| `venues/נוף של ים, קיסריה, חומות, חופה בחוץ.png` | `wedding-venues/wedding-venues-35.webp` |
| `venues/תל אביב, אינטימי, יפה, רומנטי.png` | `wedding-venues/wedding-venues-36.webp` |

## Reference-only files

These nine files were not copied into the runtime pool:

- `bride & groom/REFERENCE_ONLY.JPG`, `REFERENCE_ONLY1.JPG`
- `flowers and decorations/REFERENCE_ONLY.JPG`, `REFERENCE_ONLY1.JPG`, `REFERENCE_ONLY2.JPG`
- `photography/REFERENCE_ONLY.JPG`, `REFERENCE_ONLY1.JPG`, `REFERENCE_ONLY2.JPG`, `REFERENCE_ONLY3.JPG`

They informed only broad mood/composition. No reference URL, external image host, or hotlink is used.

## Deterministic mapping and runtime behavior

`scripts/generate-marketplace-seed.mjs` owns the image-pool counts and deterministic mapping. Most
subcategories use their fixed vendor order modulo the subcategory pool size. Venues use a fixed,
documented 36-image permutation chosen for location, setting, style, and scale: Jerusalem stone and
mountain anchors stay in Jerusalem/Ein Kerem; seaside anchors go to Sharon; desert images go to the
South; Tel Aviv gets urban/intimate imagery. Preparation hotels have a small fixed mapping so
Jerusalem-stone rooms stay in the Jerusalem area and the hillside sea view stays in Haifa.

All 198 images are referenced by at least one vendor. These are fictional portfolio/demo images,
not claims that a real business occupies the depicted location. The 432 vendor identities, 2,380
reviews, all prices, areas, styles, services, capacities, IDs and slugs were unchanged by the initial
image-pool replacement. Subsequent explicit venue corrections are recorded below.

The latest controlled diversity pass is detailed in `MARKETPLACE_VISUAL_REVIEW.md`. Photography and
video now use explicit 22-cover maps, including a few suitable existing cross-category images;
magnets use 22 individual covers. No exact primary image repeats inside these three subcategories.
The physical per-folder counts above differ from the 22-card cover counts because two older video
portraits now serve photography, and suitable existing editorial/detail/filming shots are shared
across categories. Other categories retain their existing mappings and approved assets.

The same local paths are emitted into fallback JSON and SQL image rows. Next.js serves and optimizes
them from the web root; Supabase is not needed to display them. Future Vendor uploads still use the
existing Supabase Storage architecture. The data generator validates image references/containers but
does not regenerate photographs. `e2e/public.spec.ts` verifies actual browser decoding of all unique
pool images, plus visible cards across 15 subcategories.

## Validation on 2026-09-03

- All 162 runtime WebPs decoded with Pillow and Chromium; zero decode errors or duplicate hashes.
- `pnpm seed:check`, ESLint, TypeScript, 26 Vitest tests, six Playwright tests, and production build passed.
- Manual browser verification covered visible daytime/evening venue photographs, a vendor profile,
  the disconnected-preview banner, Drone + South filtering (nine results), and videographer page 2 (ten results).
- A checkpoint comparison confirmed that all non-image JSON fields are identical and non-image SQL sections are unchanged.
- All 432 obsolete SVG files and their generator logic were removed only after WebP runtime validation.
- No database seed, migration, Supabase connection, commit, push, or deployment was performed.

## Subsequent venue feedback

Only two runtime photographs were revised using the built-in image-generation editor, preserving
their URLs and the 162-file pool. Their untouched original sources remain in ignored staging.

- `wedding-venues/wedding-venues-22.webp` (Noya): dry early-evening Mediterranean courtyard view,
  low local buildings and olive trees; simpler furniture and lighting, without rainy glass, grand
  fireplace or theatrical curtains. Keep a photorealistic wide indoor reception composition.
- `wedding-venues/wedding-venues-33.webp` (Mosaic): replace the all-white ornate hall with warm
  textured plaster/stone, wood and dark steel accents, matte floors, modest pendants and restrained
  blush/terracotta flowers. Keep a photorealistic wide hall, laid tables and dancefloor; no branding.

These are the edit briefs; both outputs were cropped to 1200 × 900 and encoded as WebP at quality 87.
The approved all-white source for image 33 is no longer an exact runtime copy because the user
explicitly rejected that appearance in this later review.

Explicit demo corrections live in `venueCorrections` in the deterministic seed generator:
Luna → Jaffa, Tel Aviv; Olive → Kibbutz Ga'ash / Sharon and ₪340–440 per guest;
Lark → Caesarea and ₪380–480 per guest; Arava → ₪350–450 per guest; Velvet → Citrus.
Descriptions and image alt text follow those corrections; stable IDs/slugs are preserved.
The three rating-only annotations could not reliably identify their vendors and remain unapplied.
No ratings or reviews were changed.

Validation after these corrections: deterministic generation check, TypeScript, ESLint,
27 Vitest tests, seven Playwright tests and production build passed. All 162 assets decoded
with Pillow and Chromium. Both edited profile images were also visually checked in the browser.
A pre-feedback JSON comparison found only the five intended vendor records changed; every ID,
slug, rating and review remained identical. SQL was regenerated as a local file only, not executed.

## Venue feedback: second pass

Eight further runtime images were replaced with built-in image generation/editing, preserving their
base filenames and the 162-asset total. Originals were preserved in ignored staging, and all outputs
were normalized to 1200 × 900 WebP (quality 87):

| Runtime venue image | Vendor | Requested visual change |
| --- | --- | --- |
| 28 | Moon | Fewer tables, open circulation and dry Mediterranean hillside instead of lush forest |
| 04 | Harbor | Contemporary Israeli stone/glass reception hall near Jerusalem |
| 30 | Golden | Plain plaster/stone garden wall instead of Gothic doorway; ceremony retained |
| 02 | Linen | Shoresh event garden with modest stone building rather than castle arcades |
| 14 | Cypress | Warm night courtyard venue in Eilat; no sea backdrop |
| 21 | Honey | New Rishon LeZion wedding hall with dancefloor, bar and reception seating |
| 19 | Silver | New Ashkelon coastal event venue with ceremony and reception spaces |
| 10 | Tamar | New Holon wedding hall, not restaurant seating |

Mosaic's warmer image 33 was retained. Browser inspection reproduced its stale white card thumbnail
despite the changed original file. Ten revised images (including Noya and Mosaic from the first pass)
now use a deterministic `?v=<12-character SHA-256 prefix>` generated from the asset bytes. This makes
Next.js/browser cache keys change with the photograph without adding files. `images.localPatterns`
allows query strings only within the demo marketplace path; other local paths remain query-free.

Review-score corrections produce displayed ratings: Wild 4.0, North 4.5, South 4.2, Lark 4.0,
Mosaic 3.9 and Pomegranate 4.0. Review text/choose-again flags follow the revised scores. The user
approved two additional fictional reviews for South (three total) because one review with four
integer criteria cannot produce a displayed 4.2. There are now 2,382 reviews; existing review IDs
and every vendor ID/slug are preserved. New review IDs use a separate deterministic range.

Location corrections: Juniper → Ein Hemed; Linen → Shoresh; Orchid → Masada;
Honey → Rishon LeZion / Central Israel; Indigo → Hadera / Sharon; Willow → Kibbutz Hulda.
Synthetic per-guest pricing: South ₪380–480; Orchid ₪550–700. All other data is preserved except
the matching location descriptions and explicitly requested rating-related review content.

Exact prompts and source paths are recorded locally in the ignored
`.codex-tmp/venue-feedback-round2-manifest.json`. No database operation is part of generation.

Second-pass validation passed: deterministic generation, TypeScript, ESLint, 28 Vitest tests,
eight Playwright tests, production build, and decoding of all 162 files with Pillow and Chromium.
The browser suite checks versioned cover sources and displayed ratings/locations across venue
pages 1–3. Manual before/after verification confirmed Mosaic's card now uses the warmer image.
Existing vendor identities and all previous review IDs were preserved; non-venue JSON records
are identical to the pre-pass snapshot. No commit, push, deployment or database operation occurred.
