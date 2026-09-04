# Targeted marketplace visual review — 2026-09-04

## Scope and results

- Runtime pool: **162 → 198 WebPs**. **38 original images generated:** 36 additions and 2 in-place replacements.
- Physical files replaced: Rimon's `wedding-venues-07.webp` and `magnet-photographers-04.webp`. Their previous versions remain in ignored local backups.
- Wedding Photographers: **5 new files**, 12 physical files in its folder, **22 distinct primary covers** using 10 suitable existing cross-category editorial/detail images.
- Videographers: **15 new files**, 22 physical files in its folder, **22 distinct primary covers**. Two older non-filming portraits now serve photography; two existing social-content gimbal images serve video.
- Magnet Photographers: **17 generated images** (16 additions + 1 replacement), **22 distinct primary covers** and 22 physical files.
- Exact primary-image duplicates within these three subcategories: **0**. Previously the three sets had only 7 / 7 / 6 unique covers for 22 vendors each.
- 50 vendor image URLs changed (including two cache-version changes). This is different from the two physical file replacements.
- Pool size: **22,296,816 → 25,866,408 bytes** (21.26 → 24.67 MiB), an increase of 3,569,592 bytes (3.40 MiB).
- Average WebP: **137,635 → 130,638 bytes** (127.58 KiB after). All runtime files remain 1200 × 900.
- Approved MUST_USE assets remain unchanged. Reference-only files are not runtime dependencies. No external image host or new metadata system was added.
- The original source files, prompts and final contact sheets are retained in ignored `.codex-tmp` folders; only optimized WebPs belong to the runtime pool.

## Visual review

Reviewed the final runtime covers rather than only the source PNGs. The three category contact sheets show varied subjects, distances, poses, moments, indoor/outdoor settings and lighting. Photography includes portraits, preparation, details, urban walking, first look, reception candid and blue-hour imagery. Video covers visibly show filming activity. Magnets show printing, display boards, collection and keepsake interactions. The approved magnet photographer portrait remains as requested.

All new full-size generation outputs and final cropped contact sheets were inspected for hands/faces, equipment, small printed photos, category fit, repeated compositions, crops, obvious fake text and watermarks. No exact file hashes repeat. Existing approved images were not replaced simply for stylistic similarity. Other pools were reviewed selectively and retained; the expansion is concentrated where repetition was most visible.

## Explicit browser-comment exceptions

The user's browser comments were treated as narrow exceptions to the general data-preservation rule:

| Vendor | Requested change applied |
| --- | --- |
| Rimon (formerly Rimon Estate Works) | New wedding-hall image; existing Jaffa city retained because the comment said Haifa but did not clearly authorize moving it. |
| Sol (formerly Sol Estate & Co.) | Ramat Gan → Tel Aviv. |
| Dawn Photography Collective | Rating 4.5 → 4.0. |
| Lark Photography Studio | Ein Kerem → Tel Aviv; base service region Jerusalem → Central Israel, retaining North and Sharon; rating → 4.8. |
| Pomegranate Photography Works | ₪6,600–₪8,850 → ₪12,500–₪16,500; rating → 4.1. |
| Golden Photography Atelier | New original blue-hour Kinneret cover. |
| Mosaic Films Works | Mevaseret Zion → Ramat Gan, with Central Israel first in service areas while retaining Jerusalem/South; rating → 4.6. |
| Golden Films & Co. | Rating → 4.5. |

Ratings still come from the four existing integer criteria on fictional reviews. No calculation/business logic changed and no review records were added or removed in this pass.

## Data safety

All **432 vendor IDs and slugs**, gallery IDs, and all **2,382 review IDs/counts** are preserved. The requested 2,380 count predates the two explicitly approved South Estate House reviews from the preceding task; those two were retained. The field-by-field baseline comparison passed with zero unexpected changes. Venue descriptions, image alt text and name-bearing review text changed only where strictly name-dependent. All other fields outside the explicit browser-comment exceptions are unchanged. No schema, Auth, routes, components, recommendation logic or Supabase architecture changed.

## Venue display names

“Estate” appears in **35 names before, 0 afterward**. Citrus is retained unchanged. Legacy slugs deliberately keep their old names.

| Previous display name | Current display name |
| --- | --- |
| Alma Estate & Co. | Alma |
| Cedar Estate Workshop | Beit Erez |
| Luna Estate Atelier | Luna Courtyard |
| Noya Estate Collective | Noya |
| Olive Estate House | Zayit |
| Dawn Estate Project | Shahar |
| Carmel Estate Studio | Orna |
| Arava Estate Works | Yamim |
| Lark Estate & Co. | Keshet Caesarea |
| Pomegranate Estate Workshop | Rimonim |
| Citrus | Citrus |
| Mosaic Estate Collective | Mosaic |
| Golden Estate House | Gan Rimon |
| Quiet Estate Project | Carmel View |
| Wild Estate Studio | Akko Arches |
| Moon Estate Works | Zichron Glasshouse |
| Sage Estate & Co. | Mitzpe Rosh Pina |
| Fig Estate Workshop | Nof Kinneret |
| Terra Estate Atelier | Tivon Grove |
| North Estate Collective | Oren Jerusalem |
| South Estate House | Ein Kerem Terrace |
| Harbor Estate Project | Mevaseret |
| Juniper Estate Studio | Hemed Courtyard |
| Linen Estate Works | Shoresh |
| Orchid Estate & Co. | Arava Light |
| Amber Estate Workshop | Laila |
| Silver Estate Atelier | Ashkelon Blue |
| Aster Estate Collective | Mitzpe Horizon |
| Cypress Estate House | Dekel Eilat |
| Honey Estate Project | Tamarind |
| Canvas Estate Studio | Canvas Rooftop |
| Rimon Estate Works | Rimon |
| Sol Estate & Co. | Sol |
| Tamar Estate Workshop | Tamar |
| Indigo Estate Atelier | Indigo |
| Willow Estate Collective | Hulda Orchard |

## Generation prompt set

Built-in image generation was used, not an API/CLI provider. Common brief: one original photorealistic premium editorial wedding marketplace photograph, landscape 4:3; natural anatomy and material texture; elegant romantic sophisticated direction; no logos, watermarks, fake text, collage or borders. Magnet briefs additionally required realistic print scale, paper edges and service-specific activity. Final selected outputs were locally cropped/resized and WebP-encoded at quality 83, method 6.

- `wedding-photographers/wedding-photographers-08.webp`: Wide cinematic wedding portrait at blue hour by the Kinneret lakeshore in Israel. A bride and groom are small full-body silhouettes dancing loosely at the water's edge, veil flowing sideways, distant hills, soft reflected twilight. Cool silvery blue with a little warm shore light. Unposed movement, no gardens or stone arches.
- `wedding-photographers/wedding-photographers-09.webp`: Direct-flash documentary wedding reception photograph. Bride laughing exuberantly with two women friends at a table, caught mid toast, champagne glasses held naturally, candid joyful expressions. Close waist-up asymmetric framing, lively but sophisticated, dark softly blurred reception behind them, no garden.
- `wedding-photographers/wedding-photographers-10.webp`: Original editorial wedding photograph of a bride and groom crossing a quiet modern Tel Aviv street at morning light. Wide lateral view, whole bodies walking, bride simple silk dress, groom light gray suit, Bauhaus balconies and subtle shadows. Candid movement, realistic urban Israel, no famous landmarks, no text or cars blocking couple.
- `wedding-photographers/wedding-photographers-11.webp`: Intimate wedding documentary photograph, tight close-up of bride and groom's hands resting together on cream linen after the ceremony, exactly two natural hands with simple wedding bands, a small edge of lace sleeve and dark suit cuff. Soft directional window light, tactile fabric and real skin texture, restrained editorial composition.
- `wedding-photographers/wedding-photographers-12.webp`: Artistic wedding first-look photograph from high above on a curved pale-stone staircase. Bride in ivory dress on lower landing, groom looking back toward her one step above, whole figures framed by elegant sweeping architectural curves, dramatic diagonal daylight and shadow. Sophisticated overhead composition, no garden portrait.
- `videographers/videographers-08.webp`: A woman cinematographer in a charcoal linen suit seen in profile operating a cinema camera on a tripod during a daylight outdoor chuppah ceremony. Wide side view, wedding couple small in distance, cypress garden, camera and operator clearly main subjects.
- `videographers/videographers-09.webp`: Close side view of a professional wedding filmmaker's hands operating a cinema camera with follow-focus and monitor on a reception balcony. Realistic coherent camera rig in actual use, blurred bride and groom entering a warmly lit hall in background, no product-shot isolation.
- `videographers/videographers-10.webp`: A wedding filmmaker walking backward with a two-handed gimbal as the newlyweds walk through a modern Tel Aviv courtyard. Full-body wide shot, operator in foreground in profile, contemporary limestone and glass, crisp morning light.
- `videographers/videographers-11.webp`: A female wedding filmmaker kneeling discreetly beside a bridal preparation room doorway, using a compact cinema camera at waist height to capture bride's mother fastening her veil. Soft window light, candid behind the scenes, show clearly camera operation.
- `videographers/videographers-12.webp`: Wedding cinematographer operating shoulder-mounted professional video camera beside a dancefloor. Low side-angle with filmmaker sharply visible, guests dancing softly blurred behind, amber and restrained burgundy reception lighting, energetic realistic documentary photo.
- `videographers/videographers-13.webp`: A two-person wedding film crew arranging a camera slider on a low tripod to film invitation and rings on a bridal suite table. Wide elevated view, hands naturally operating equipment, silk and bouquet details, actual preparation scene rather than studio product imagery.
- `videographers/videographers-14.webp`: A videographer with a black cinema camera on a monopod filming wedding speeches from the side of an elegant long reception table. A guest standing speaking in distance, afternoon window light, candid wide horizontal shot, filmmaking equipment visibly in use.
- `videographers/videographers-15.webp`: Rear three-quarter view of a wedding filmmaker holding a gimbal low beside a couple's wedding car as the bride steps out. Cream vintage sedan at Israeli venue entrance, afternoon shadows, filmmaking action main focus, original premium documentary photograph.
- `videographers/videographers-16.webp`: Wedding camera operator framed through an open doorway, adjusting tripod-mounted cinema camera in foreground while bride and groom share their first dance beyond. Cool blue night outside contrasting amber ballroom, full operator visible side-on, wide architecture.
- `videographers/videographers-17.webp`: A wedding filmmaker on a seaside promenade filming a bride's flowing veil with a cinema camera and external monitor. Operator woman wearing practical black clothing in side profile, wind, pale Mediterranean sky, couple small and distant, natural restrained editorial photo.
- `videographers/videographers-18.webp`: Close three-quarter view of a mature wedding filmmaker wearing headphones monitoring a cinema-camera screen while recording an outdoor ceremony. Face and camera both in focus, reception canopy soft background, soft overcast daylight, documentary portrait of working professional.
- `videographers/videographers-19.webp`: High angle behind-the-scenes wedding film crew at a rooftop reception at dusk. One camera operator beside a tripod and another using gimbal, guests and couple dancing below, realistic Tel Aviv low-rise skyline, balanced wide view, no drone product.
- `videographers/videographers-20.webp`: Videographer crouched near a row of chairs filming a flower girl walking toward a chuppah, cinema camera supported by both hands with monitor visible. Intimate garden ceremony with white fabric and warm afternoon sunlight, side-on candid scene, elegant and respectful.
- `videographers/videographers-21.webp`: Wedding cinematographer filming a bride laughing with bridesmaids on a hotel terrace, camera on stabilized rig, operator foreground right in full side profile, women grouped naturally left, early morning warm light, wide horizontal framing, avoid fake text.
- `videographers/videographers-22.webp`: Nighttime wedding filmmaking scene during a lively reception hora dance. Videographer standing at edge with cinema camera on shoulder, discreet small on-camera light, guests circling couple blurred through movement, sophisticated candid documentary, camera operation central.
- `magnet-photographers/magnet-photographers-07.webp`: Top-down photograph of freshly printed small rectangular wedding photo magnets arranged in neat staggered rows on a linen reception table. Each shows different candid guests from same wedding, thin white borders, no words. Warm elegant wedding context, no novelty props.
- `magnet-photographers/magnet-photographers-08.webp`: Two elegantly dressed wedding guests joyfully holding small freshly printed wedding photo magnets at chest height, looking down at their pictures. Tight candid waist-up framing, natural hands, softly blurred candlelit reception, photo prints visibly main action.
- `magnet-photographers/magnet-photographers-09.webp`: A staff member in black arranging rows of small wedding photo magnets on a cream metal display panel near reception entrance. Side view, real small glossy guest portraits, warm garden string lights behind, tasteful documentary service photography, no signs.
- `magnet-photographers/magnet-photographers-10.webp`: Close view of compact professional event photo printer delivering a small guest photograph beside stacks of freshly printed photo magnets. Linen-covered wedding service table with restrained florals behind, realistic functioning equipment, not generic product photo.
- `magnet-photographers/magnet-photographers-11.webp`: Wedding photographer candidly photographing a group of three dressed-up guests near a reception courtyard. Side view of photographer actively using flash camera; foreground small tray of fresh photo magnets makes the print service clear, sunset natural lighting.
- `magnet-photographers/magnet-photographers-12.webp`: An elegant freestanding magnetic display board filled with evenly spaced small candid wedding guest photographs, viewed at an oblique angle in a stone reception courtyard. Some empty spaces where guests collected photos, understated flowers, no text, realistic photo magnets.
- `magnet-photographers/magnet-photographers-13.webp`: Close editorial photograph of a hand picking a small wedding photo magnet from rows on a dark wood reception table. Two natural hands maximum, different couple and group images printed on white-bordered rectangles, candlelight, shallow depth of field.
- `magnet-photographers/magnet-photographers-14.webp`: Two wedding reception staff members preparing fresh photo magnets at a discreet linen-covered printing station, one operating printer and one placing prints on display. Medium wide documentary view, visible guests beyond, sophisticated indoor venue, no props or logos.
- `magnet-photographers/magnet-photographers-15.webp`: A smiling older wedding guest showing a freshly printed small photo magnet to her partner at a reception table. Natural warm candid moment, photograph clearly visible between their hands, elegant evening attire, soft cream florals and wine glasses.
- `magnet-photographers/magnet-photographers-16.webp`: Macro editorial still life of a few small wedding photograph magnets leaning against a pale stone stand, visible thin dark magnetic backing on one turned print. Guests and couple pictured on glossy faces, ivory table linen, gentle daylight, premium wedding keepsakes.
- `magnet-photographers/magnet-photographers-17.webp`: A wedding magnet photographer taking a candid guest portrait near a chuppah after ceremony, assistant beside a portable cream display board of fresh photo magnets in foreground. Wide daylight composition, action and service unmistakable, no novelty booth.
- `magnet-photographers/magnet-photographers-18.webp`: Guests in evening attire collecting their small photo magnets from a softly illuminated reception display wall. Wide diagonal view with several distinct groups, photographs legible as little images not text, natural hands and anatomy, warm ambient light.
- `magnet-photographers/magnet-photographers-19.webp`: Overhead photograph of staff hands sorting fresh wedding photo magnets into elegant shallow wooden trays. Small glossy prints show varied wedding guests, ivory table covering, neatly placed printer at edge, practical refined event service, no written labels.
- `magnet-photographers/magnet-photographers-20.webp`: Close-up of a wedding guest's hand holding two different small photo magnets in front of softly blurred night reception lights. One print shows a couple, one group of friends; believable fingers and paper edges, elegant natural keepsake moment.
- `magnet-photographers/magnet-photographers-21.webp`: A daylight wedding reception photo-print service station beneath a shaded pergola. Compact printer, laptop angled away with no readable UI, cream magnetic board with guest photographs, attendant organizing prints, Mediterranean plants, documentary wide view.
- `magnet-photographers/magnet-photographers-22.webp`: A photographer and assistant handing freshly printed photo magnets to newlyweds at the end of their reception, medium candid shot. Simple dark staff attire, bride ivory dress, obvious small prints changing hands naturally, warm intimate atmosphere.
- `magnet-photographers/magnet-photographers-04.webp`: An elegant wedding guest couple posing for a magnet photographer who is visible in the left foreground using a flash camera. To the right a small cream magnetic board displays freshly printed guest photographs. Medium-wide candid wedding reception scene, clearly instant photo magnet service, no novelty props.
- `wedding-venues/wedding-venues-07.webp`: A contemporary Israeli wedding venue hall inspired by intimate urban venues in Haifa: wide architectural view from one corner showing a proper open dance floor, round wedding tables seating about 180 guests, low white floral arrangements, walnut panels, pale stone, tall glass doors to a planted terrace. Understated warm lighting at dusk, sophisticated realistic proportions, clearly a wedding hall not a restaurant, no sea or identifiable landmarks.

## Validation and Git

All requested local validation passed:

- 198/198 files exist and decode in Pillow and Chromium, with zero broken URLs or duplicate file hashes.
- Deterministic generator consistency and valid JSON/SQL seed output.
- Field-by-field baseline audit: zero unexpected changes, all IDs/slugs and review counts preserved.
- Byte comparison confirms all 24 currently retained exact approved assets are unchanged; the three earlier owner-requested venue revisions were also left unchanged in this pass.
- TypeScript, ESLint, **29 Vitest tests**, **9 Playwright tests**, and production build.
- Playwright verified all 66 priority-category cards across both pages, plus all venue cards and prior corrections.
- Manual browser review covered Wedding Photographers, Videographers, Magnet Photographers and Wedding Venues & Gardens. Final contact sheets for all four groups and the remaining runtime pools were reviewed.
- Git whitespace check passed (only the repository's existing LF/CRLF notices).

Final Git status: **20 modified tracked files, 434 previously deleted tracked files, 200 untracked files** (198 WebPs and two image-review documents). Nothing staged. The pre-existing modifications/deletions were preserved. HEAD remains `03783992e0335b82570700abe10a411542d03a8c`.

No commit, staging, push, Supabase operation, migration execution, database seeding, deployment or paid service occurred. The SQL seed file was regenerated locally only and was never executed. Existing unrelated uncommitted work was preserved.
