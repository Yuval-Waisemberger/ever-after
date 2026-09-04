import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");

const categories = [
  ["venues", "Venues", "Wedding venues and gardens"],
  ["photography-content", "Photography & Content", "Photography, video, magnets, and social content"],
  ["music-entertainment", "Music & Entertainment", "DJs and guest entertainment"],
  ["beauty-attire", "Beauty & Attire", "Wedding attire, makeup, and hair"],
  ["design-flowers", "Design & Flowers", "Event design, flowers, invitations, and gifts"],
  ["event-services", "Event Services", "Logistics, officiants, managers, and preparation locations"],
];

const types = [
  { slug: "wedding-venues", name: "Wedding Venues & Gardens", category: "venues", count: 36, price: [[220, 310], [300, 410], [390, 510], [500, 620]], services: ["Venue hire", "In-house catering", "Bar service", "Sound and lighting", "On-site event manager", "Accessible parking", "Bridal suite", "Late-night food", "Kosher menu", "Furniture and linens", "Rain backup", "Ceremony setup"], styles: ["Nature", "Rustic / Countryside", "Elegant", "Urban", "Romantic", "Luxury", "Vintage", "Israeli", "Intimate", "Modern"], suffix: "Estate", noun: "venue" },
  { slug: "wedding-photographers", name: "Wedding Photographers", category: "photography-content", count: 22, price: [[6500, 9000], [8500, 12000], [11000, 15000], [14500, 18500]], services: ["Stills", "Documentary coverage", "Editorial portraits", "Second photographer", "Albums", "Drone", "Engagement session", "Online gallery", "Family portraits", "Film photography", "Fast preview", "Social-content add-on"], styles: ["Romantic", "Vintage", "Elegant", "Modern", "Nature", "Urban", "Intimate", "Classic"], suffix: "Photography", noun: "photography" },
  { slug: "videographers", name: "Videographers", category: "photography-content", count: 22, price: [[4500, 7000], [6500, 9000], [8500, 11500], [10500, 13500]], services: ["Highlight film", "Full ceremony film", "Documentary edit", "Drone", "Second videographer", "Social teaser", "Raw footage", "Full speeches", "Vertical clips", "Same-week trailer", "Licensed music", "Preparation coverage"], styles: ["Elegant", "Romantic", "Modern", "Intimate", "Classic", "Urban", "Nature", "Party / Festival"], suffix: "Films", noun: "wedding film" },
  { slug: "magnet-photographers", name: "Magnet Photographers", category: "photography-content", count: 22, price: [[1200, 1700], [1600, 2200], [2100, 2700], [2600, 3200]], services: ["Unlimited magnets", "On-site printing", "Large magnets", "Custom frame design", "Digital gallery", "Extra photographer", "Wooden blocks", "Thank-you magnets", "Late-night coverage", "Branded envelopes", "Black-and-white option", "Fast delivery"], styles: ["Party / Festival", "Modern", "Classic", "Urban", "Romantic", "Israeli"], suffix: "Magnets", noun: "magnet photography" },
  { slug: "social-content", name: "Social Content", category: "photography-content", count: 22, price: [[1800, 2600], [2400, 3400], [3200, 4400], [4100, 5500]], services: ["Vertical video", "Behind the scenes", "Same-day selects", "Edited reels", "Preparation coverage", "Ceremony clips", "Dance-floor clips", "Phone photography", "24-hour delivery", "Content planning", "Guest interviews", "Raw clip folder"], styles: ["Modern", "Urban", "Party / Festival", "Romantic", "Luxury", "Minimalist"], suffix: "Social", noun: "social content" },
  { slug: "djs", name: "DJs", category: "music-entertainment", count: 22, price: [[4000, 5800], [5500, 7300], [7000, 9000], [8800, 11000]], services: ["DJ set", "Planning meeting", "Ceremony music", "Reception music", "Backup equipment", "Custom edits", "Live percussion add-on", "After-party set", "Wireless microphones", "Bilingual announcements", "Vinyl set add-on", "Sound-system coordination"], styles: ["Party / Festival", "Israeli", "Modern", "Urban", "Classic", "Luxury", "Intimate"], suffix: "Sound", noun: "DJ" },
  { slug: "attractions", name: "Attractions", category: "music-entertainment", count: 22, price: [[1800, 3200], [3000, 4800], [4500, 7000], [6500, 10000]], services: ["Live percussion", "Saxophone set", "LED performers", "Interactive dance team", "Bubble installation", "Cocktail-hour ensemble", "Caricature station", "Children's corner", "Fire-safe cold sparks", "Live painting", "Roaming musicians", "After-party act"], styles: ["Party / Festival", "Modern", "Luxury", "Israeli", "Romantic", "Urban"], suffix: "Experiences", noun: "wedding attraction" },
  { slug: "photo-booths", name: "Photo Booths", category: "music-entertainment", count: 22, price: [[1500, 2200], [2100, 2900], [2800, 3700], [3500, 4500]], services: ["Open-air booth", "Enclosed booth", "GIF booth", "Custom backdrop", "Instant prints", "Digital gallery", "Guest book", "Attendant", "Neon sign", "Props", "Black-and-white portraits", "360 video booth"], styles: ["Party / Festival", "Modern", "Vintage", "Urban", "Elegant", "Romantic"], suffix: "Booth", noun: "photo booth" },
  { slug: "wedding-dresses", name: "Wedding Dresses", category: "beauty-attire", count: 22, price: [[2500, 5500], [5000, 8500], [8000, 12500], [11500, 18000]], services: ["Ready-to-wear", "Made to measure", "Alterations", "Second-look dress", "Veil styling", "Fabric consultation", "Private fittings", "Rental option", "Modest collection", "Accessories", "Rush alterations", "Preservation guidance"], styles: ["Romantic", "Classic", "Vintage", "Modern", "Minimalist", "Luxury", "Elegant", "Rustic / Countryside"], suffix: "Bridal", noun: "bridal atelier" },
  { slug: "suits", name: "Suits", category: "beauty-attire", count: 22, price: [[1200, 2600], [2400, 4200], [4000, 6500], [6200, 10000]], services: ["Suit fitting", "Made to measure", "Alterations", "Shirt and tie", "Shoes", "Waistcoat", "Summer fabrics", "Tuxedo option", "Rental option", "Express fitting", "Accessories", "Second shirt"], styles: ["Classic", "Modern", "Elegant", "Vintage", "Minimalist", "Luxury", "Urban"], suffix: "Tailoring", noun: "suit studio" },
  { slug: "makeup-hair", name: "Makeup & Hair", category: "beauty-attire", count: 22, price: [[1500, 2400], [2200, 3300], [3100, 4300], [4100, 5500]], services: ["Bridal makeup", "Bridal hair", "Combined package", "Trial session", "Travel to preparation location", "Touch-up kit", "Second hairstyle", "Early-start service", "Family makeup", "Hair extensions styling", "Groom grooming", "Event touch-ups"], styles: ["Minimalist", "Romantic", "Classic", "Modern", "Luxury", "Elegant", "Vintage", "Intimate"], suffix: "Beauty", noun: "bridal beauty" },
  { slug: "event-design", name: "Event & Chuppah Design", category: "design-flowers", count: 22, price: [[3000, 6500], [6000, 10000], [9500, 16000], [15000, 25000]], services: ["Chuppah design", "Table styling", "Reception design", "Lighting concept", "Furniture styling", "Signage", "Ceremony aisle", "Fabric installation", "Candles", "Floral coordination", "Custom structures", "Setup and strike"], styles: ["Romantic", "Nature", "Elegant", "Modern", "Luxury", "Rustic / Countryside", "Vintage", "Minimalist", "Israeli"], suffix: "Design", noun: "event design" },
  { slug: "flowers", name: "Flowers", category: "design-flowers", count: 22, price: [[1500, 4500], [4000, 8500], [8000, 14000], [13000, 20000]], services: ["Bridal bouquet", "Chuppah flowers", "Table arrangements", "Personal flowers", "Welcome arrangement", "Aisle flowers", "Seasonal sourcing", "Bud vases", "Large installations", "Flower station", "Setup and strike", "Arrangement reuse"], styles: ["Romantic", "Nature", "Vintage", "Elegant", "Minimalist", "Rustic / Countryside", "Luxury", "Modern"], suffix: "Florals", noun: "floral studio" },
  { slug: "invitations", name: "Invitations", category: "design-flowers", count: 22, price: [[500, 1200], [1000, 1900], [1800, 3000], [2800, 4500]], services: ["Digital invitation", "Printed suite", "Save the date", "Bilingual layout", "Custom illustration", "RSVP card", "Envelope addressing", "Menu cards", "Seating cards", "Wax seals", "Rush proofing", "Print coordination"], styles: ["Minimalist", "Romantic", "Vintage", "Modern", "Elegant", "Israeli", "Luxury", "Nature"], suffix: "Paper", noun: "invitation studio" },
  { slug: "guest-gifts", name: "Guest Gifts", category: "design-flowers", count: 22, price: [[800, 1800], [1600, 3000], [2800, 4700], [4500, 7000]], services: ["Personalized favors", "Locally made gifts", "Edible favors", "Plant favors", "Welcome bags", "Custom labels", "Place-card gifts", "Eco packaging", "Delivery to venue", "Assembly", "Small-batch production", "Thank-you cards"], styles: ["Israeli", "Nature", "Rustic / Countryside", "Romantic", "Modern", "Minimalist", "Luxury", "Vintage"], suffix: "Favors", noun: "guest gifts" },
  { slug: "transportation", name: "Transportation", category: "event-services", count: 22, price: [[900, 1700], [1500, 2500], [2300, 3600], [3400, 5000]], services: ["Guest shuttle", "Minibus", "Full-size coach", "Multiple pickup points", "Late-night return", "Accessible vehicle", "Route planning", "On-site coordinator", "Bridal car", "Driver waiting time", "North-south routes", "Emergency backup vehicle"], styles: ["Classic", "Modern", "Luxury", "Party / Festival", "Intimate"], suffix: "Transit", noun: "wedding transport" },
  { slug: "officiants", name: "Rabbis & Officiants", category: "event-services", count: 22, price: [[800, 1600], [1400, 2400], [2200, 3400], [3200, 4500]], services: ["Ceremony meeting", "Personalized ceremony", "Traditional ceremony", "Egalitarian ceremony", "Bilingual ceremony", "Ketubah guidance", "Civil-celebration option", "Family participation", "Rehearsal", "Short ceremony", "Cultural consultation", "Travel nationwide"], styles: ["Israeli", "Classic", "Modern", "Intimate", "Romantic", "Elegant"], suffix: "Ceremonies", noun: "officiant" },
  { slug: "event-managers", name: "Event Managers", category: "event-services", count: 22, price: [[1500, 2600], [2400, 3600], [3400, 4800], [4600, 6500]], services: ["Wedding-day coordination", "Full planning", "Vendor timeline", "Budget tracking", "Venue liaison", "Guest logistics", "Final confirmations", "Setup supervision", "Payment envelope plan", "Emergency kit", "Rehearsal coordination", "Post-event closeout"], styles: ["Classic", "Modern", "Elegant", "Luxury", "Intimate", "Party / Festival", "Nature"], suffix: "Planning", noun: "event management" },
  { slug: "preparation-hotels", name: "Hotels & Preparation Locations", category: "event-services", count: 22, price: [[1200, 2500], [2300, 4000], [3800, 6200], [5800, 9000]], services: ["Bridal preparation suite", "Overnight stay", "Late checkout", "Breakfast", "Natural-light room", "Photo-friendly spaces", "Family rooms", "Parking", "Terrace", "Vendor access", "Champagne package", "Post-wedding brunch"], styles: ["Luxury", "Classic", "Modern", "Urban", "Romantic", "Nature", "Intimate", "Vintage"], suffix: "House", noun: "preparation location" },
];

const imagePoolCounts = {
  "wedding-venues": 36,
  "wedding-photographers": 12,
  videographers: 22,
  "magnet-photographers": 22,
  "social-content": 10,
  djs: 12,
  attractions: 7,
  "photo-booths": 8,
  "wedding-dresses": 12,
  suits: 9,
  "makeup-hair": 12,
  "event-design": 8,
  flowers: 10,
  invitations: 12,
  "guest-gifts": 7,
  transportation: 5,
  officiants: 5,
  "event-managers": 6,
  "preparation-hotels": 12,
};

// A deterministic permutation keeps all 36 venue photographs in use. The specifically
// curated Israeli location images are assigned to compatible venue rows rather than randomly.
const venueImageNumberByLocalIndex = [
  36, 3, 1, 22, 32, 24, 9, // Central Israel: urban/intimate, stone, garden, and modern halls.
  34, 35, 13, 27, 33, 30, // Sharon: coastal anchors, glass gardens, and warm evening settings.
  6, 25, 28, 17, 18, 11, // North: modern Haifa, Acre stone, Zichron glass, and hillside settings.
  31, 26, 4, 12, 2, // Jerusalem: stone/mountain anchors plus indoor and courtyard options.
  8, 29, 19, 20, 14, 21, // South: desert, Israeli evening hall, coast, and indoor/outdoor space.
  16, 7, 5, 10, 15, 23, // Additional Central venues: rooftop, courtyard, garden, urban, and citrus.
];

// Jerusalem-stone rooms stay with Jerusalem-area vendors; the hillside sea view stays in Haifa.
const hotelImageNumberByLocalIndex = [6, 4, 2, 5, 1, 7, 8, 9, 10, 11, 12, 3, 4, 2, 1, 5, 6, 7, 9, 10, 11, 8];

// Unique primary covers within each priority subcategory. Cross-category reuse of
// suitable editorial/detail shots keeps the physical pool controlled.
const photographyCovers = [
  ["wedding-photographers", 1], ["wedding-photographers", 2], ["wedding-photographers", 3],
  ["wedding-photographers", 4], ["wedding-photographers", 5], ["wedding-photographers", 6],
  ["wedding-photographers", 7], ["wedding-photographers", 8], ["suits", 4],
  ["wedding-photographers", 9], ["transportation", 1], ["flowers", 3],
  ["videographers", 4], ["wedding-dresses", 10], ["wedding-photographers", 10],
  ["invitations", 1], ["suits", 9], ["wedding-photographers", 11],
  ["makeup-hair", 9], ["videographers", 7], ["wedding-photographers", 12], ["suits", 8],
];
const videoCovers = [
  ["videographers", 1], ["videographers", 2], ["videographers", 3],
  ["videographers", 8], ["videographers", 5], ["videographers", 6],
  ["videographers", 9], ["videographers", 10], ["videographers", 11],
  ["videographers", 12], ["videographers", 13], ["videographers", 14],
  ["videographers", 15], ["videographers", 16], ["videographers", 17],
  ["videographers", 18], ["videographers", 19], ["videographers", 20],
  ["videographers", 21], ["videographers", 22], ["social-content", 2], ["social-content", 4],
];

// Curated category-appropriate supplements, not new copies of the same files.
// Twelve-cover cycles prevent exact repeats in ordinary 12-card browsing pages;
// intentional reuse on later pages keeps this a controlled demo asset pool.
const curatedCovers = {
  // The grooming cover belongs to a vendor that actually offers groom grooming.
  "makeup-hair": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11].map((number) => ["makeup-hair", number]),
  "social-content": [...Array.from({ length: 10 }, (_, i) => ["social-content", i + 1]), ["videographers", 21], ["videographers", 10]],
  "photo-booths": [...Array.from({ length: 8 }, (_, i) => ["photo-booths", i + 1]), ["magnet-photographers", 10], ["magnet-photographers", 19], ["magnet-photographers", 20], ["magnet-photographers", 14]],
  "event-design": [...Array.from({ length: 8 }, (_, i) => ["event-design", i + 1]), ["flowers", 5], ["flowers", 6], ["flowers", 8], ["event-managers", 4]],
  flowers: [...Array.from({ length: 8 }, (_, i) => ["flowers", i + 1]), ["event-design", 4], ["flowers", 9], ["event-design", 2], ["flowers", 10]],
};

// Display names only: legacy slugs and all IDs deliberately remain stable.
const venueDisplayNames = [
  "Alma", "Beit Erez", "Luna Courtyard", "Noya", "Zayit", "Shahar", "Orna",
  "Yamim", "Keshet Caesarea", "Rimonim", "Citrus", "Mosaic", "Gan Rimon",
  "Carmel View", "Akko Arches", "Zichron Glasshouse", "Mitzpe Rosh Pina", "Nof Kinneret",
  "Tivon Grove", "Oren Jerusalem", "Ein Kerem Terrace", "Mevaseret", "Hemed Courtyard",
  "Shoresh", "Arava Light", "Laila", "Ashkelon Blue", "Mitzpe Horizon", "Dekel Eilat",
  "Tamarind", "Canvas Rooftop", "Rimon", "Sol", "Tamar", "Indigo", "Hulda Orchard",
];

// Explicit browser feedback only; keys are stable one-based vendor sequences.
const portfolioCorrections = {
  37: { reviewScores: [[4, 4, 4, 4]] },
  40: { city: "Tel Aviv", area: "central_israel", serviceAreas: ["central_israel", "north", "sharon"], reviewScores: [[5, 5, 5, 4]] },
  41: { price: [12500, 16500], reviewScores: [[5, 4, 4, 4], [4, 4, 4, 4]] },
  44: { price: [8000, 11000], reviewScores: [[4, 4, 4, 4], [4, 4, 4, 3]] },
  50: { reviewScores: [[4, 4, 4, 4]] },
  51: { city: "Central District", area: "central_israel", serviceAreas: ["central_israel", "north"], extraReviews: 1, reviewScores: [[5, 5, 5, 4]] },
  60: { city: "Ramat Gan", area: "central_israel", serviceAreas: ["central_israel", "jerusalem", "south"], reviewScores: [[5, 5, 5, 4], [5, 5, 4, 4], [5, 4, 5, 4], [5, 5, 5, 4], [4, 5, 4, 5], [5, 4, 4, 5], [5, 5, 5, 4], [5, 4, 5, 4]] },
  61: { reviewScores: [[5, 5, 4, 4]] },
};

// Revised covers must not reuse an optimized/browser-cached previous photograph.
// The content hash changes only when that local asset changes; no extra files are needed.
const revisedVenueImages = new Map(await Promise.all([2, 4, 7, 10, 14, 19, 21, 22, 28, 30, 33].map(async (number) => {
  const file = `wedding-venues-${String(number).padStart(2, "0")}.webp`;
  const bytes = await readFile(path.join(root, "public", "demo-marketplace", "wedding-venues", file));
  return [number, createHash("sha256").update(bytes).digest("hex").slice(0, 12)];
})));
const revisedMagnetImages = new Map(await Promise.all([4, 8].map(async (number) => {
  const file = `magnet-photographers-${String(number).padStart(2, "0")}.webp`;
  return [number, createHash("sha256").update(await readFile(path.join(root, "public/demo-marketplace/magnet-photographers", file))).digest("hex").slice(0, 12)];
})));

const regions = ["central_israel", "sharon", "north", "jerusalem", "south", "central_israel", "sharon", "north", "south", "jerusalem", "central_israel"];
const cities = {
  central_israel: ["Tel Aviv", "Jaffa", "Ramat Gan", "Holon", "Petah Tikva", "Rishon LeZion", "Rehovot"],
  sharon: ["Herzliya", "Netanya", "Kfar Saba", "Ra'anana", "Hadera", "Pardes Hanna"],
  north: ["Haifa", "Acre", "Zichron Ya'akov", "Rosh Pina", "Tiberias", "Kiryat Tiv'on"],
  jerusalem: ["Jerusalem", "Ein Kerem", "Mevaseret Zion", "Beit Shemesh", "Abu Ghosh"],
  south: ["Beersheba", "Ashdod", "Ashkelon", "Mitzpe Ramon", "Eilat", "Sderot"],
};
const venueLocations = Object.entries(cities).flatMap(([area, areaCities]) => areaCities.map((city) => ({ area, city })));
// Targeted owner-reviewed demo corrections. Keys are stable venue-local indexes;
// keep the original identity/slug generation and all other vendors unchanged.
const venueCorrections = {
  2: { city: "Jaffa, Tel Aviv" },
  4: { city: "Kibbutz Ga'ash", area: "sharon", price: [340, 440] },
  7: { price: [350, 450] },
  8: { city: "Caesarea", price: [380, 480], reviewScores: [[4, 4, 4, 4], [5, 4, 4, 3], [4, 5, 3, 4]] },
  9: { reviewScores: [[4, 4, 4, 4], [4, 5, 4, 3], [5, 4, 3, 4]] },
  10: { businessName: "Citrus" },
  11: { reviewScores: [[4, 4, 4, 4], [4, 4, 4, 3], [5, 4, 4, 3], [4, 4, 3, 4], [4, 4, 4, 4]] },
  14: { reviewScores: [[4, 4, 4, 4], [5, 4, 4, 3], [4, 5, 3, 4]] },
  19: { reviewScores: [[5, 5, 4, 4], [5, 4, 5, 4], [4, 5, 4, 5]] },
  20: { price: [380, 480], extraReviews: 2, reviewScores: [[5, 4, 4, 4], [4, 5, 4, 4], [4, 4, 4, 4]] },
  22: { city: "Ein Hemed" },
  23: { city: "Shoresh" },
  24: { city: "Masada", price: [550, 700] },
  29: { city: "Rishon LeZion", area: "central_israel" },
  32: { city: "Tel Aviv" },
  34: { city: "Hadera", area: "sharon" },
  35: { city: "Kibbutz Hulda" },
};
const brandWords = ["Alma", "Cedar", "Luna", "Noya", "Olive", "Dawn", "Carmel", "Arava", "Lark", "Pomegranate", "Velvet", "Mosaic", "Golden", "Quiet", "Wild", "Moon", "Sage", "Fig", "Terra", "North", "South", "Harbor", "Juniper", "Linen", "Orchid", "Amber", "Silver", "Aster", "Cypress", "Honey", "Canvas", "Rimon", "Sol", "Tamar", "Indigo", "Willow", "Kinneret", "Jasmine", "Dune", "Grove"];
const brandForms = ["& Co.", "Collective", "Studio", "Workshop", "House", "Works", "Atelier", "Project"];
const eventTypes = ["evening", "friday_afternoon", "daytime"];
const couples = ["Dana & Amit", "Noa & Gil", "Shira & Tom", "Yael & Ori", "Maya & Ron", "Lihi & Ben", "Tamar & Dan", "Neta & Gal", "Roni & Tal", "Adi & Yonatan", "Hila & Eyal", "Bar & Lior", "Eden & Omer", "Yuval & Niv", "Ella & Nadav", "Rotem & Ariel", "Shani & Itai", "Gaya & Alon"];

const categoryBySlug = Object.fromEntries(categories.map((value, index) => [value[0], { id: uuid("10000000", index + 1), name: value[1] }]));
const categoryTypeCounters = {};
const typeBySlug = Object.fromEntries(types.map((value, index) => {
  categoryTypeCounters[value.category] = (categoryTypeCounters[value.category] ?? 0) + 1;
  return [value.slug, { ...value, id: uuid("20000000", index + 1), sort: categoryTypeCounters[value.category] * 10 }];
}));

function uuid(prefix, number) {
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, "0")}`;
}
function pick(values, index) { return values[((index % values.length) + values.length) % values.length]; }
function rotate(values, start, count) {
  const step = values.length % 5 === 0 ? 3 : 5;
  return [...new Set(Array.from({ length: count }, (_, offset) => pick(values, start + offset * step)))];
}
function slugify(value) { return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function average(review) { return (review.professionalism + review.punctuality + review.serviceAttitude + review.valueForMoney) / 4; }
function sqlText(value) { return value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`; }
function sqlTextArray(values) { return values.length ? `array[${values.map(sqlText).join(", ")}]` : "array[]::text[]"; }
function sqlEnumArray(values, type) { return values.length ? `array[${values.map(sqlText).join(", ")}]::public.${type}[]` : `array[]::public.${type}[]`; }

function reviewCount(index) {
  if (index % 17 === 0) return 0;
  if (index % 13 === 0) return 14 + (index % 5);
  if (index % 11 === 0) return 2;
  if (index % 7 === 0) return 1;
  if (index % 5 === 0) return 8 + (index % 5);
  return 3 + (index % 5);
}

function imageNumberFor(subcategorySlug, localIndex) {
  if (subcategorySlug === "wedding-venues") return venueImageNumberByLocalIndex[localIndex];
  if (subcategorySlug === "preparation-hotels") return hotelImageNumberByLocalIndex[localIndex];
  return (localIndex % imagePoolCounts[subcategorySlug]) + 1;
}

function imageUrlFor(subcategorySlug, localIndex) {
  const cover = subcategorySlug === "wedding-photographers" ? photographyCovers[localIndex]
    : subcategorySlug === "videographers" ? videoCovers[localIndex]
    : curatedCovers[subcategorySlug]?.[localIndex % curatedCovers[subcategorySlug].length];
  const imageNumber = cover?.[1] ?? imageNumberFor(subcategorySlug, localIndex);
  subcategorySlug = cover?.[0] ?? subcategorySlug;
  const version = subcategorySlug === "wedding-venues" ? revisedVenueImages.get(imageNumber)
    : subcategorySlug === "magnet-photographers" ? revisedMagnetImages.get(imageNumber) : undefined;
  return `/demo-marketplace/${subcategorySlug}/${subcategorySlug}-${String(imageNumber).padStart(2, "0")}.webp${version ? `?v=${version}` : ""}`;
}

function makeReview(vendor, reviewIndex, globalIndex) {
  const scorePatterns = [[4, 4, 3, 3], [4, 4, 4, 3], [4, 4, 4, 4], [5, 4, 4, 4], [5, 5, 4, 4], [5, 5, 5, 4], [5, 5, 5, 5]];
  const basePattern = pick([0, 1, 2, 3, 4, 5, 3, 4, 2, 3], vendor.sequence);
  const variation = reviewIndex > 0 && reviewIndex % 7 === 0 ? 1 : reviewIndex > 0 && reviewIndex % 5 === 0 ? -1 : 0;
  const reviewedScores = vendor.subcategorySlug === "wedding-venues" ? venueCorrections[vendor.sequence - 1]?.reviewScores : portfolioCorrections[vendor.sequence]?.reviewScores;
  const scores = reviewedScores ? pick(reviewedScores, reviewIndex) : scorePatterns[Math.max(0, Math.min(scorePatterns.length - 1, basePattern + variation))];
  const data = { professionalism: scores[0], punctuality: scores[1], serviceAttitude: scores[2], valueForMoney: scores[3] };
  const avg = average(data);
  const strength = pick(vendor.services, reviewIndex);
  const positives = [
    `The ${strength.toLowerCase()} was thoughtfully handled and the team communicated clearly throughout.`,
    `${vendor.businessName} understood the atmosphere we wanted and delivered a result that felt personal.`,
    `We appreciated the organized process, especially around ${strength.toLowerCase()} and the final details.`,
    `The service suited our ${pick(vendor.styles, reviewIndex).toLowerCase()} celebration and guests noticed the care.`,
    `Questions were answered with patience, and the plan for ${strength.toLowerCase()} was easy to understand.`,
  ];
  const mildNotes = [
    "The final coordination took one extra call, but everything was resolved calmly.",
    "We would have liked a little more detail in the first proposal, although the follow-up was helpful.",
    "The schedule felt tight at first, then improved once we confirmed responsibilities.",
    "A small last-minute adjustment was needed, and the team handled it professionally.",
    "The package was not the cheapest option, but its inclusions were clear and useful.",
  ];
  const text = avg >= 4.5 ? `${pick(positives, globalIndex)} We would happily choose them again.` : avg >= 4 ? `${pick(positives, globalIndex)} ${pick(mildNotes, globalIndex + 2)}` : `${pick(mildNotes, globalIndex)} The core service was solid and matched what we agreed.`;
  return {
    id: uuid("50000000", 100000 + globalIndex), vendorId: vendor.id,
    reviewerDisplayName: pick(couples, vendor.sequence + reviewIndex * 5), ...data,
    wouldChooseAgain: avg >= 3.75, reviewText: text,
    createdAt: new Date(Date.UTC(2023 + ((vendor.sequence + reviewIndex) % 3), (vendor.sequence * 2 + reviewIndex) % 12, 2 + ((vendor.sequence + reviewIndex * 3) % 25), 10, 0, 0)).toISOString(),
  };
}

function makeVendor(config, typeIndex, localIndex, sequence) {
  const venue = config.slug === "wedding-venues";
  const correction = venue ? venueCorrections[localIndex] : portfolioCorrections[sequence];
  const fixedLocation = venue ? pick(venueLocations, localIndex) : null;
  const primaryArea = correction?.area ?? fixedLocation?.area ?? pick(regions, sequence + typeIndex * 2);
  const city = correction?.city ?? fixedLocation?.city ?? pick(cities[primaryArea], sequence + localIndex * 2);
  const mobile = !["wedding-venues", "preparation-hotels"].includes(config.slug);
  const serviceAreas = correction?.serviceAreas ?? (mobile
    ? (localIndex % 10 === 9 ? ["flexible"] : [...new Set([primaryArea, ...rotate(regions, sequence, 3)])].slice(0, 2 + (localIndex % 2)))
    : [primaryArea]);
  const tier = localIndex % 4;
  const [bandMin, bandMax] = config.price[tier];
  const minPrice = correction?.price?.[0] ?? bandMin + (localIndex % 3) * Math.max(1, Math.round((bandMax - bandMin) * 0.04));
  const maxPrice = correction?.price?.[1] ?? bandMax - ((localIndex + 1) % 3) * Math.max(1, Math.round((bandMax - bandMin) * 0.03));
  const first = pick(brandWords, localIndex + typeIndex * 5);
  const form = pick(brandForms, localIndex * 3 + typeIndex);
  const slug = `${slugify(`${first} ${config.suffix} ${form}`)}-${String(localIndex + 1).padStart(2, "0")}`;
  const displayForm = form.toLowerCase() === config.suffix.toLowerCase() ? "Retreat" : form;
  const businessName = venue ? venueDisplayNames[localIndex] : `${first} ${config.suffix} ${displayForm}`;
  const services = rotate(config.services, localIndex + typeIndex, 4 + (localIndex % 3));
  const styles = rotate(config.styles, localIndex * 2 + typeIndex, 2 + (localIndex % 3));
  const locationBased = ["wedding-venues", "preparation-hotels"].includes(config.slug);
  const eventRelevant = ["wedding-venues", "djs", "attractions", "photo-booths", "transportation", "event-managers", "preparation-hotels"].includes(config.slug);
  const events = eventRelevant ? rotate(eventTypes, localIndex, 1 + (localIndex % 3)) : [];
  const minGuests = venue ? 50 + (localIndex % 6) * 30 : null;
  const maxGuests = venue ? minGuests + 140 + (localIndex % 7) * 70 : null;
  const indoorAvailable = locationBased ? localIndex % 4 !== 0 : null;
  const outdoorAvailable = locationBased ? localIndex % 4 !== 1 : null;
  const tierLabel = ["essential", "classic", "extended", "signature"][tier];
  const tierWithArticle = `${/^[aeiou]/i.test(tierLabel) ? "an" : "a"} ${tierLabel}`;
  const primaryStyle = styles[0].toLowerCase();
  const styleWithArticle = `${/^[aeiou]/i.test(primaryStyle) ? "an" : "a"} ${primaryStyle}`;
  const scope = venue
    ? `hosts ${minGuests}–${maxGuests} guests with ${vendorSetting(indoorAvailable, outdoorAvailable)}`
    : serviceAreas.includes("flexible")
      ? "travels nationwide"
      : `serves ${serviceAreas.map((area) => area.replaceAll("_", " ")).join(" and ")}`;
  const descriptions = [
    `${businessName} pairs ${services[0].toLowerCase()} with ${services[1].toLowerCase()} for ${styles[0].toLowerCase()} celebrations. Based in ${city}, the team ${scope} and offers ${tierWithArticle} package with ${services[2].toLowerCase()}.`,
    `${styleWithArticle[0].toUpperCase()}${styleWithArticle.slice(1)} ${config.noun} from ${city}, ${businessName} focuses on ${services[0].toLowerCase()}, ${services[1].toLowerCase()}, and clear planning. Its ${tierLabel} option includes ${services[2].toLowerCase()}; it ${scope}.`,
    `Couples looking for ${styleWithArticle} approach can combine ${services[0].toLowerCase()} and ${services[1].toLowerCase()} at ${businessName}. The ${city}-based ${config.noun} ${scope}, with ${services[2].toLowerCase()} available in its ${tierLabel} package.`,
    `${businessName} is built around ${services[0].toLowerCase()} and ${styleWithArticle} point of view. From ${city}, this ${config.noun} ${scope}; the ${tierLabel} package also covers ${services[1].toLowerCase()} and ${services[2].toLowerCase()}.`,
    `Based in ${city}, ${businessName} offers a focused mix of ${services[0].toLowerCase()}, ${services[1].toLowerCase()}, and ${services[2].toLowerCase()}. The ${config.noun} suits ${styles.slice(0, 2).join(" and ").toLowerCase()} events, ${scope}, and has ${tierWithArticle} package structure.`,
    `The ${tierLabel} collection at ${businessName} centers on ${services[0].toLowerCase()} with ${services[1].toLowerCase()} as a practical complement. This ${city} ${config.noun} ${scope} and is styled for ${styles.slice(0, 2).join(" or ").toLowerCase()} weddings.`,
    `${services[0]} leads the offer at ${businessName}, supported by ${services[1].toLowerCase()} and ${services[2].toLowerCase()}. The ${config.noun} works from ${city}, ${scope}, and shapes its ${tierLabel} package for ${styleWithArticle} atmosphere.`,
    `${businessName} brings ${styleWithArticle} sensibility to ${services[0].toLowerCase()} from its ${city} base. It ${scope}; couples can add ${services[1].toLowerCase()} and ${services[2].toLowerCase()} within the ${tierLabel} package.`,
  ];
  const description = pick(descriptions, localIndex + typeIndex * 2);
  return {
    id: uuid("30000000", 1000 + sequence), sequence, slug, businessName, contactName: `Demo Contact ${sequence}`,
    description, homeArea: primaryArea, categoryId: categoryBySlug[config.category].id, categorySlug: config.category,
    categoryName: categoryBySlug[config.category].name, subcategoryId: config.id, subcategorySlug: config.slug,
    subcategoryName: config.name, locationCity: city, serviceAreas,
    minPriceMinor: minPrice * 100, maxPriceMinor: Math.max(minPrice, maxPrice) * 100,
    services, styles, eventTypes: events, minGuestCapacity: minGuests, maxGuestCapacity: maxGuests,
    fridayAvailable: eventRelevant ? localIndex % 3 !== 1 : null,
    indoorAvailable,
    outdoorAvailable,
    phone: null, email: `${slug}@demo-vendor.test`,
    websiteUrl: `https://example.com/demo-vendors/${slug}`, instagramUrl: `https://example.com/demo-instagram/${slug}`,
    isPublic: true,
    imageUrl: imageUrlFor(config.slug, localIndex),
    imageAlt: `Demo ${config.noun} portfolio image for ${businessName}`,
  };
}

function vendorSetting(indoor, outdoor) {
  if (indoor && outdoor) return "indoor and open-air options";
  if (indoor) return "a dedicated indoor setting";
  return "an open-air setting";
}

let sequence = 1;
const vendors = [];
for (const [typeIndex, config] of types.entries()) {
  for (let localIndex = 0; localIndex < config.count; localIndex += 1) vendors.push(makeVendor({ ...config, id: typeBySlug[config.slug].id }, typeIndex, localIndex, sequence++));
}

let reviewSequence = 1;
const reviews = [];
for (const vendor of vendors) {
  vendor.reviews = Array.from({ length: reviewCount(vendor.sequence) }, (_, index) => makeReview(vendor, index, reviewSequence++));
  // Approved additional demo reviews use a separate deterministic ID range, so no
  // previously generated review IDs or subsequent vendors' review text shift.
  const extraReviews = (vendor.subcategorySlug === "wedding-venues" ? venueCorrections[vendor.sequence - 1]?.extraReviews : portfolioCorrections[vendor.sequence]?.extraReviews) ?? 0;
  for (let index = 0; index < extraReviews; index += 1) {
    vendor.reviews.push(makeReview(vendor, vendor.reviews.length, 200000 + vendor.sequence * 10 + index));
  }
  reviews.push(...vendor.reviews);
  vendor.ratingAverage = vendor.reviews.length ? vendor.reviews.reduce((sum, review) => sum + average(review), 0) / vendor.reviews.length : null;
  vendor.reviewCount = vendor.reviews.length;
  vendor.gallery = [{ id: uuid("40000000", 1000 + vendor.sequence), url: vendor.imageUrl, alt: vendor.imageAlt }];
  vendor.recommendation = null;
}

function sql() {
  const categoryRows = categories.map(([slug, name, description], index) => `  (${sqlText(categoryBySlug[slug].id)}, ${sqlText(slug)}, ${sqlText(name)}, ${sqlText(description)}, ${(index + 1) * 10})`).join(",\n");
  const subcategoryRows = types.map((type) => `  (${sqlText(typeBySlug[type.slug].id)}, ${sqlText(categoryBySlug[type.category].id)}, ${sqlText(type.slug)}, ${sqlText(type.name)}, ${typeBySlug[type.slug].sort})`).join(",\n");
  const vendorRows = vendors.map((vendor) => `  (${[sqlText(vendor.id), sqlText(vendor.slug), sqlText(vendor.businessName), sqlText(vendor.contactName), sqlText(vendor.description), sqlText(vendor.locationCity), sqlText(vendor.categoryId), sqlText(vendor.subcategoryId), sqlEnumArray(vendor.serviceAreas, "wedding_area"), vendor.minPriceMinor, vendor.maxPriceMinor, sqlTextArray(vendor.services), sqlTextArray(vendor.styles), sqlEnumArray(vendor.eventTypes, "wedding_event_type"), vendor.minGuestCapacity ?? "null", vendor.maxGuestCapacity ?? "null", vendor.fridayAvailable ?? "null", vendor.indoorAvailable ?? "null", vendor.outdoorAvailable ?? "null", sqlText(vendor.phone), sqlText(vendor.email), sqlText(vendor.websiteUrl), sqlText(vendor.instagramUrl), "true"].join(", ")})`).join(",\n");
  const imageRows = vendors.map((vendor) => `  (${sqlText(vendor.gallery[0].id)}, ${sqlText(vendor.id)}, ${sqlText(vendor.imageUrl)}, ${sqlText(vendor.imageAlt)}, 0, true)`).join(",\n");
  const reviewRows = reviews.map((review) => `  (${[sqlText(review.id), sqlText(review.vendorId), sqlText(review.reviewerDisplayName), review.professionalism, review.punctuality, review.serviceAttitude, review.valueForMoney, review.wouldChooseAgain, sqlText(review.reviewText), "true", "true", sqlText(review.createdAt)].join(", ")})`).join(",\n");
  return `-- GENERATED FILE. Edit scripts/generate-marketplace-seed.mjs, then run pnpm seed:generate.\n-- Fictional deterministic demo data only; no credentials or real vendor claims.\nbegin;\n\ninsert into public.vendor_categories (id, slug, name, description, sort_order) values\n${categoryRows}\non conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;\n\ninsert into public.vendor_subcategories (id, category_id, slug, name, sort_order) values\n${subcategoryRows}\non conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, sort_order = excluded.sort_order;\n\ninsert into public.vendor_profiles (id, slug, business_name, contact_name, description, location_city, category_id, subcategory_id, service_areas, min_price_minor, max_price_minor, services, styles, event_types, min_guest_capacity, max_guest_capacity, friday_available, indoor_available, outdoor_available, phone, email, website_url, instagram_url, is_public) values\n${vendorRows}\non conflict (slug) do update set business_name = excluded.business_name, contact_name = excluded.contact_name, description = excluded.description, location_city = excluded.location_city, category_id = excluded.category_id, subcategory_id = excluded.subcategory_id, service_areas = excluded.service_areas, min_price_minor = excluded.min_price_minor, max_price_minor = excluded.max_price_minor, services = excluded.services, styles = excluded.styles, event_types = excluded.event_types, min_guest_capacity = excluded.min_guest_capacity, max_guest_capacity = excluded.max_guest_capacity, friday_available = excluded.friday_available, indoor_available = excluded.indoor_available, outdoor_available = excluded.outdoor_available, phone = excluded.phone, email = excluded.email, website_url = excluded.website_url, instagram_url = excluded.instagram_url, is_public = excluded.is_public;\n\ninsert into public.vendor_images (id, vendor_id, external_url, alt_text, sort_order, is_primary) values\n${imageRows}\non conflict (id) do update set vendor_id = excluded.vendor_id, external_url = excluded.external_url, storage_path = null, alt_text = excluded.alt_text, sort_order = excluded.sort_order, is_primary = excluded.is_primary;\n\ninsert into public.reviews (id, vendor_id, reviewer_display_name, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, is_public, is_seeded, created_at) values\n${reviewRows}\non conflict (id) do update set vendor_id = excluded.vendor_id, reviewer_display_name = excluded.reviewer_display_name, professionalism = excluded.professionalism, punctuality = excluded.punctuality, service_attitude = excluded.service_attitude, value_for_money = excluded.value_for_money, would_choose_again = excluded.would_choose_again, review_text = excluded.review_text, is_public = excluded.is_public, is_seeded = excluded.is_seeded, created_at = excluded.created_at;\n\ncommit;\n`;
}

const fallbackOmissions = new Set(["sequence", "homeArea", "contactName", "categoryId", "subcategoryId", "indoorAvailable", "outdoorAvailable", "isPublic"]);
function fallbackVendor(vendor) {
  return Object.fromEntries(Object.entries(vendor).filter(([key]) => !fallbackOmissions.has(key)));
}

const subcategoryCounts = Object.fromEntries(types.map((type) => [type.slug, vendors.filter((vendor) => vendor.subcategorySlug === type.slug).length]));

function validate() {
  if (vendors.length !== 432) throw new Error(`Expected 432 vendors, received ${vendors.length}.`);
  if (new Set(vendors.map((vendor) => vendor.id)).size !== vendors.length || new Set(vendors.map((vendor) => vendor.slug)).size !== vendors.length || new Set(vendors.map((vendor) => vendor.businessName)).size !== vendors.length) throw new Error("Vendor identifiers, slugs, and names must be unique.");
  if (types.some((type) => subcategoryCounts[type.slug] !== type.count || (type.slug === "wedding-venues" ? type.count < 30 : type.count < 20))) throw new Error("A subcategory vendor count is below its target.");
  for (const vendor of vendors) {
    const type = typeBySlug[vendor.subcategorySlug];
    if (!type || type.category !== vendor.categorySlug) throw new Error(`Category mismatch for ${vendor.slug}.`);
    if (vendor.minPriceMinor < 0 || vendor.minPriceMinor > vendor.maxPriceMinor) throw new Error(`Invalid price range for ${vendor.slug}.`);
    if (vendor.minGuestCapacity != null && vendor.minGuestCapacity > vendor.maxGuestCapacity) throw new Error(`Invalid capacity for ${vendor.slug}.`);
    if (!/^\/demo-marketplace\/[a-z0-9-]+\/[a-z0-9-]+-\d{2}\.webp(?:\?v=[a-f0-9]{12})?$/.test(vendor.imageUrl)) throw new Error(`Invalid image URL for ${vendor.slug}.`);
    for (const review of vendor.reviews) {
      const scores = [review.professionalism, review.punctuality, review.serviceAttitude, review.valueForMoney];
      if (scores.some((score) => score < 1 || score > 5) || review.wouldChooseAgain !== (average(review) >= 3.75)) throw new Error(`Inconsistent review ${review.id}.`);
    }
  }
  if (new Set(reviews.map((review) => review.id)).size !== reviews.length) throw new Error("Review IDs must be unique.");
}

validate();
const outputs = new Map([
  [path.join(root, "supabase", "seed.sql"), sql()],
  [path.join(root, "src", "generated", "marketplace-demo.json"), `${JSON.stringify(vendors.map(fallbackVendor), null, 2)}\n`],
]);
for (const [file, content] of outputs) {
  if (checkOnly) {
    const current = await readFile(file, "utf8").catch(() => "");
    if (current !== content) throw new Error(`${path.relative(root, file)} is stale. Run pnpm seed:generate.`);
  } else {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf8");
  }
}

const assetDirectory = path.join(root, "public", "demo-marketplace");
const referencedImageUrls = new Set(vendors.map((vendor) => vendor.imageUrl));
const expectedAssetCount = Object.values(imagePoolCounts).reduce((sum, count) => sum + count, 0);
if (referencedImageUrls.size !== expectedAssetCount) throw new Error(`Expected all ${expectedAssetCount} pooled images to be used, found ${referencedImageUrls.size}.`);
for (const imageUrl of referencedImageUrls) {
  const data = await readFile(path.join(root, "public", imageUrl.split("?")[0]));
  if (data.length < 12 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`${imageUrl} is not a valid WebP container.`);
  }
}
for (const [subcategorySlug, expectedCount] of Object.entries(imagePoolCounts)) {
  const names = (await readdir(path.join(assetDirectory, subcategorySlug))).filter((name) => name.endsWith(".webp"));
  if (names.length !== expectedCount) throw new Error(`Expected ${expectedCount} ${subcategorySlug} assets, found ${names.length}.`);
}

console.log(`${checkOnly ? "Validated" : "Generated"} ${vendors.length} fictional vendors, ${reviews.length} fictional reviews, and ${expectedAssetCount} pooled local WebP assets.`);
