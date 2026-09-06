# Marketplace Dataset Finalization Audit — 2026-09-06

## Scope and outcome

This is a local-only dataset finalization pass. It does not describe a live seed run. The deterministic Marketplace expanded from 432 to 496 vendors and from 6 to 8 top-level categories. All 432 existing vendor UUIDs and slugs remain unchanged.

The final audit found no exact full-name duplicates, punctuation/case/spacing-normalized duplicates, suffix-only duplicates, duplicate vendor IDs, duplicate slugs, or duplicate descriptions. A same-subcategory edit-distance guard was added to detect confusing generated brand identities without treating ordinary category terms as brands.

## Final taxonomy

| Top-level category | Vendor count | Subcategories |
| --- | ---: | --- |
| Venues | 36 | Wedding Venues & Gardens (36) |
| Photography & Content | 88 | Wedding Photographers (22); Videographers (22); Magnet Photographers (22); Social Content (22) |
| Music & Entertainment | 66 | DJs (22); Attractions (22); Photo Booths (22) |
| Beauty & Attire | 66 | Wedding Dresses (22); Suits (22); Makeup & Hair (22) |
| Design & Flowers | 88 | Event & Chuppah Design (22); Flowers (22); Invitations (22); Guest Gifts (22) |
| Event Services | 88 | Transportation (22); Rabbis & Officiants (22); Event Managers (22); Hotels & Preparation Locations (22) |
| Cakes & Desserts | 32 | Wedding Cakes (8); Dessert Tables (8); Pastry & Patisserie (8); Custom Sweets & Confectionery (8) |
| Wedding Accessories & Party Extras | 32 | Dance Floor Accessories (8); Glow & Light-Up Accessories (8); Guest Comfort Accessories (8); Party Props & Giveaways (8) |

Final totals: **8 top-level categories, 27 subcategories, 496 vendors, and 2,727 deterministic reviews.**

`Wedding Accessories & Party Extras` is deliberately separate from `Music & Entertainment`: its records describe physical products, comfort kits, props, glow items, and giveaways rather than performers or entertainment services.

## Existing identities changed after the duplicate audit

| Stable slug | UUID | Previous display name | Final display name | Reason |
| --- | --- | --- | --- | --- |
| `orchid-magnets-atelier-10` | `30000000-0000-4000-8000-000000001090` | Momenta | LumaPrint | Confusing one-edit collision with Mementa in the same Magnet Photographers subcategory and near-collision with Momentia. |
| `kinneret-social-house-17` | `30000000-0000-4000-8000-000000001119` | Momentia | Rega Social | Part of the Mementa / Momenta / Momentia generated identity cluster. |
| `carmel-experiences-atelier-17` | `30000000-0000-4000-8000-000000001163` | Playora | Tandem Live | One-edit synthetic collision with Layora Design Studio. |
| `mosaic-experiences-works-22` | `30000000-0000-4000-8000-000000001168` | Joyelle Wedding Entertainment | Simcha Nova Wedding Entertainment | One-edit synthetic collision with Noyelle Beauty Studio. |
| `mosaic-transit-project-17` | `30000000-0000-4000-8000-000000001361` | Pathera | Derech | Confusing one-edit generated identity near Gathera; the replacement is category-appropriate and distinct. |

Descriptions, image alt text, generated reviews that name the business, JSON, and seed SQL now use the final display names. Historical audit documents retain historical names as audit evidence only.

Other phonetic pairs surfaced by broad fuzzy matching were reviewed and retained only where they represent distinct names or share common category language rather than a distinctive brand stem. Ordinary terms such as wedding, studio, events, party, photography, and design were not treated as brand duplication.

## Primary-image integration status

The user-approved local input pool has now supplied **64 unique final primary images** for all 64 new vendors. Each integrated asset is a deterministic 1200×900 WebP named `<vendor-slug>-primary.webp`, is referenced by one vendor only, and replaces the earlier recycled cover mapping.

Coverage is complete for all eight new subcategories: Wedding Cakes, Dessert Tables, Pastry & Patisserie, Custom Sweets & Confectionery, Dance Floor Accessories, Glow & Light-Up Accessories, Guest Comfort Accessories, and Party Props & Giveaways are each **8/8**.

The final rescan found 20 source files not represented in the prior 48-file inventory even though the supplied batch was described as 19 additions. Nineteen were assigned to the 19 uncovered vendors; one broader sesame-pastry composition was left unused because it overlapped the stronger Maison Sesame image. No new vendor has a null or recycled primary mapping. Exact source-to-vendor assignments are recorded in `marketplace-approved-primary-image-coverage-2026-09-06.md`.

No existing vendor image or gallery was changed, and no additional gallery images were generated.

## Three-image gallery readiness

The existing `public.vendor_images` architecture already supports a primary image plus ordered gallery images without a migration:

- multiple rows may reference the same `vendor_id`;
- `sort_order` provides deterministic ordering;
- `is_primary` identifies the cover;
- a partial unique index allows at most one primary row per vendor;
- the `(vendor_id, sort_order)` index supports ordered retrieval;
- each row accepts exactly one Storage path or external URL.

The current deterministic seed emits one primary row per vendor. A later generator-only gallery pass can emit two additional rows with `sort_order` 1 and 2 and `is_primary = false`, producing `Primary + Gallery 2 + Gallery 3` without changing the schema.

## Integrity result

- 496/496 business names are exact-unique and normalized-unique.
- 496/496 vendor UUIDs and slugs are unique.
- Existing UUID and slug changes: 0.
- Every category/subcategory reference is valid and parent-consistent.
- All 291 referenced local WebP assets (227 pooled originals plus 64 new dedicated primaries) are present and decodable.
- Every generated review references a valid vendor.
- Marketplace category, subcategory, search, combined-filter, and pagination coverage includes both new categories while retaining the Photography & Content count of 88.
