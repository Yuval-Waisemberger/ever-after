# Marketplace Primary-Image Generation Manifest

## Scope

This manifest covers only the 64 Marketplace vendors added during the dataset-finalization pass: UUIDs `30000000-0000-4000-8000-000000001433` through `30000000-0000-4000-8000-000000001496`.

The complete machine-readable handoff is [marketplace-primary-image-generation-manifest.csv](marketplace-primary-image-generation-manifest.csv). It is derived from `src/generated/marketplace-demo.json` and records the current UUID, slug, exact business name, taxonomy, visual identity, relevant services, proposed primary scene, filename, and destination for every vendor.

This is a planning artifact only. No image was generated, no asset was added, and no current `imageUrl`, gallery row, alt text, generator mapping, generated JSON, or seed mapping was changed.

## Coverage

| Top-level category | Subcategory | Vendors |
| --- | --- | ---: |
| Cakes & Desserts | Wedding Cakes | 8 |
| Cakes & Desserts | Dessert Tables | 8 |
| Cakes & Desserts | Pastry & Patisserie | 8 |
| Cakes & Desserts | Custom Sweets & Confectionery | 8 |
| Wedding Accessories & Party Extras | Dance Floor Accessories | 8 |
| Wedding Accessories & Party Extras | Glow & Light-Up Accessories | 8 |
| Wedding Accessories & Party Extras | Guest Comfort Accessories | 8 |
| Wedding Accessories & Party Extras | Party Props & Giveaways | 8 |
| **Total** | **8 subcategories** | **64** |

## Deterministic Output Convention

- Filename: `<current-vendor-slug>-primary.webp`
- Destination: `public/demo-marketplace/<subcategory-slug>/<current-vendor-slug>-primary.webp`
- Subcategory folders: `wedding-cakes`, `dessert-tables`, `pastry-patisserie`, `custom-sweets`, `dance-floor-accessories`, `glow-accessories`, `guest-comfort-accessories`, and `party-props-giveaways`
- All 64 proposed filenames and full destination paths are unique.
- The scene descriptions intentionally avoid people-centered stock-photo compositions. The primary subject is the vendor's product, presentation system, or service setup.
- The concepts stay in Ever After's warm, editorial visual world while giving each neighboring vendor a distinct product, setting, material, lighting, or display structure.

## Creative Coverage by Subcategory

### Wedding Cakes

- **Sugar Veil Wedding Bakery** — airy sugar-veil folds, vegan tasting slice, and warm bakery window light.
- **Wedding Cakes by Almond & Ivory** — tall botanical fondant cake with sculpted almond blossoms on stone.
- **Tiered** — restrained buttercream stack with a personalized topper and fig branches in a garden setting.
- **Velvet Crumb Cake House** — burgundy velvet-textured cake with sheet-cake portions on an antique trolley.
- **Noya Bakes Cake Atelier** — blush sculptural fondant, monogram topper, and open tasting box on marble.
- **Butterline Celebration Cakes** — crisp piped buttercream tiers with white flowers and matching sheet-cake service.
- **Ganache Room Custom Cakes** — dark ganache, ivory sugar flowers, raw stone, and Mediterranean greenery.
- **Pearl Whisk Tiered Cakes** — pearl-piped buttercream tiers, silver pedestal, and vegan tasting slices.

### Dessert Tables

- **Sweet Assembly Wedding Desserts** — jewel-like vegan minis on smoked glass at a midnight dessert bar.
- **Sweet Table Studio by Pistachio Table** — pistachio-and-ivory dairy-free portions with acrylic risers and signage.
- **Honeyed** — date-and-honey pastries, kraft takeaway boxes, linen, and juniper foliage.
- **Dulce Display Table of Sweets** — individual sweets on cream stone stands with calligraphy and active replenishment.
- **Petite Feast Dessert Atelier** — tiny monochrome desserts on architectural travertine plinths.
- **Caramel Garden Sweet Displays** — caramel-toned garden station beneath warm festoon lights.
- **Treat Terrace Dessert Tables** — dairy-free fruit tarts on weathered silver trays at sunset.
- **Confetti Spoon Celebration Desserts** — polished burgundy-and-ivory late-night spoon-dessert bar.

### Pastry & Patisserie

- **Maison Sesame Wedding Pastry** — sesame-topped French tartlets and a dairy-free tasting box.
- **Pastry House by Flour & Fig** — fig-filled choux and Israeli pastries on a flour-dusted vintage table.
- **Lev Patisserie** — kosher macaron tower and dairy-free mini tarts against Jerusalem limestone.
- **Golden Rolling Pin Pastry Atelier** — seasonal-fruit choux being finished beside a gold rolling pin.
- **Meringue Lane Celebration Patisserie** — rows of meringues and macarons beneath vintage glass domes.
- **Citrus Crumb Patisserie** — citrus tartlets and choux on classic stands against textured canvas.
- **Babka & Bloom Petit Desserts** — sliced babka, petite choux, and white blossoms in a delivery presentation.
- **Poppy & Pin Pastry Studio** — a graphic grid of poppy macarons and mini tarts with brass details.

### Custom Sweets & Confectionery

- **Bonbon Tel Aviv Celebration Sweets** — graphic trays of burgundy-and-blush bonbons and vegan pralines.
- **Confectionery by Marzipan Story** — shaped marzipan favors with edible calligraphy place cards.
- **Sukar** — personalized chocolates arranged like jewelry in restrained branded boxes.
- **Praline Parcel Confection House** — small-batch praline parcels, ribbon, and edible name cards.
- **Nougat Note Wedding Sweets** — musical nougat forms in refined favor packaging.
- **Candy Ketubah Chocolate Studio** — ceremonial-paper-inspired chocolate tablets on velvet.
- **Cocoa Keepsake Edible Favors** — cocoa favors and marzipan seals in vintage keepsake boxes.
- **Halva Heart Sweet Atelier** — modern heart-shaped halva and nougat in custom packaging.

### Dance Floor Accessories

- **Rikud After-Party Goods** — organized hats, funwear, distribution kits, and cleanup bags in an urban flat lay.
- **Dance Floor Kits by Afterglow Kit** — a luxury rolling cart of personalized signs and bulk prop packs.
- **Dance Basket** — an overflowing woven basket of glasses, hats, and funwear at the dance floor.
- **Midnight Extras Dance Floor Accessories** — personalized hats and props in romantic baskets under string lights.
- **Floor Fizz Wedding Funwear** — a graphic wall of color-matched glasses and handheld signs.
- **Hora Supply Dance Floor Extras** — a coordinated hora station surrounding an empty dance floor.
- **Ritmo Party Goods** — rhythmic sign arrangement with matching bulk guest packs on a polished bar.
- **Last Song Props Party Accessory Studio** — understated late-night funwear with distribution and cleanup packs.

### Glow & Light-Up Accessories

- **Luma Loop Glow Accessories** — concentric warm-glowing bracelets and LED rings in ivory packaging.
- **Illuminated Extras by Neon Mazel** — necklaces and foam sticks on an urban battery-check bench.
- **Glowline Israel** — warm-white illuminated glasses, bracelets, and rings on a luxury bar.
- **Radiant Wrist Light-Up Goods** — wearable wrist lights shown in use beside minimalist guest kits.
- **Liel Lights Night Accessories** — foam sticks and glasses in delivery crates with visible battery testing.
- **Night Spark After-Dark Goods** — a dawn-to-night wall of coordinated LED packs and necklaces.
- **Halo Extras Glow Bar** — a circular halo bar with numbered distribution kits.
- **Electric Joy Light-Up Studio** — modular amber-lit product trays and bold packages, with no blue/purple palette.

### Guest Comfort Accessories

- **Soft Step Comfort Accessories** — fans and discreet stain kits in coordinated display baskets.
- **Comfort Station by Fan & Favor** — a sized flip-flop wall with compact comfort-favor baskets at an outdoor venue.
- **Barefoot Basket** — heel protectors and handheld fans in a rustic minimalist basket.
- **Breeze Booth Wedding Comfort Kits** — a shaded self-service booth with warm-weather and stain-removal kits.
- **Comfy Celebration Wedding Extras** — a labeled late-night station for heel protectors and fans.
- **Guest Ease Guest Comfort** — modern coordinated baskets of stain-removal and warm-weather care packs.
- **Summer Solace Guest Essentials** — a sleek size-labeled flip-flop wall for late-night self-service.
- **Rest & Revel Guest Care Goods** — fans, stain kits, and baskets arranged in golden-hour bulk rows.

### Party Props & Giveaways

- **Mazel Makers Wedding Extras** — personalized dance props and small gift boxes on a maker table.
- **Party Props by Cheers Cart** — a vintage celebration cart with hats, photo props, and take-home packs.
- **Funveil** — veil-inspired ribbon props with tagged personalized giveaways.
- **Party Parade Goods Guest Giveaways** — color-coordinated hats and gifts in a tiered parade-like display.
- **Toast Tokens Wedding Giveaways** — ceremonial token favors in vintage take-home packaging.
- **Joy Kit Dance Floor Props** — a travel-case-style kit of hats, gifts, and coordinated props.
- **Celebrate Small Party Kits** — a compact city-venue kit of themed photo props and pouches.
- **Dancing Details Celebration Extras** — polished bulk dance props and personalized giveaways before guest arrival.

## Generation Boundary

When the assets are generated separately, they should be reviewed for subject accuracy, duplicate-looking compositions, WebP decoding, and consistent aspect ratio before any image mapping is updated. This document does not authorize or perform that mapping step.
