import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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

const regions = ["central_israel", "sharon", "north", "jerusalem", "south", "central_israel", "sharon", "north", "south", "jerusalem", "central_israel"];
const cities = {
  central_israel: ["Tel Aviv", "Jaffa", "Ramat Gan", "Holon", "Petah Tikva", "Rishon LeZion", "Rehovot"],
  sharon: ["Herzliya", "Netanya", "Kfar Saba", "Ra'anana", "Hadera", "Pardes Hanna"],
  north: ["Haifa", "Acre", "Zichron Ya'akov", "Rosh Pina", "Tiberias", "Kiryat Tiv'on"],
  jerusalem: ["Jerusalem", "Ein Kerem", "Mevaseret Zion", "Beit Shemesh", "Abu Ghosh"],
  south: ["Beersheba", "Ashdod", "Ashkelon", "Mitzpe Ramon", "Eilat", "Sderot"],
};
const venueLocations = Object.entries(cities).flatMap(([area, areaCities]) => areaCities.map((city) => ({ area, city })));
const brandWords = ["Alma", "Cedar", "Luna", "Noya", "Olive", "Dawn", "Carmel", "Arava", "Lark", "Pomegranate", "Velvet", "Mosaic", "Golden", "Quiet", "Wild", "Moon", "Sage", "Fig", "Terra", "North", "South", "Harbor", "Juniper", "Linen", "Orchid", "Amber", "Silver", "Aster", "Cypress", "Honey", "Canvas", "Rimon", "Sol", "Tamar", "Indigo", "Willow", "Kinneret", "Jasmine", "Dune", "Grove"];
const brandForms = ["& Co.", "Collective", "Studio", "Workshop", "House", "Works", "Atelier", "Project"];
const eventTypes = ["evening", "friday_afternoon", "daytime"];
const palettes = [
  ["#6f263d", "#d6aa63", "#f6eee5"], ["#1f4b45", "#c79a61", "#edf1e8"], ["#313b5a", "#cf9c9c", "#f5eee8"],
  ["#805b35", "#a7b18b", "#f5ead9"], ["#51344d", "#d3ae7f", "#eee5ec"], ["#1f5363", "#d6b172", "#e7f0ef"],
  ["#7b3f2d", "#d8a86e", "#f4e8dc"], ["#37482d", "#c9a45c", "#eef0e5"], ["#563848", "#c7868f", "#f7ecea"],
  ["#25435b", "#c8ad83", "#eaf0f2"], ["#684d2e", "#bba56c", "#f2ecdc"], ["#4a385f", "#d1a86d", "#f1eaf5"],
];
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

function makeReview(vendor, reviewIndex, globalIndex) {
  const scorePatterns = [[4, 4, 3, 3], [4, 4, 4, 3], [4, 4, 4, 4], [5, 4, 4, 4], [5, 5, 4, 4], [5, 5, 5, 4], [5, 5, 5, 5]];
  const basePattern = pick([0, 1, 2, 3, 4, 5, 3, 4, 2, 3], vendor.sequence);
  const variation = reviewIndex > 0 && reviewIndex % 7 === 0 ? 1 : reviewIndex > 0 && reviewIndex % 5 === 0 ? -1 : 0;
  const scores = scorePatterns[Math.max(0, Math.min(scorePatterns.length - 1, basePattern + variation))];
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
  const fixedLocation = venue ? pick(venueLocations, localIndex) : null;
  const primaryArea = fixedLocation?.area ?? pick(regions, sequence + typeIndex * 2);
  const city = fixedLocation?.city ?? pick(cities[primaryArea], sequence + localIndex * 2);
  const mobile = !["wedding-venues", "preparation-hotels"].includes(config.slug);
  const serviceAreas = mobile
    ? (localIndex % 10 === 9 ? ["flexible"] : [...new Set([primaryArea, ...rotate(regions, sequence, 3)])].slice(0, 2 + (localIndex % 2)))
    : [primaryArea];
  const tier = localIndex % 4;
  const [bandMin, bandMax] = config.price[tier];
  const minPrice = bandMin + (localIndex % 3) * Math.max(1, Math.round((bandMax - bandMin) * 0.04));
  const maxPrice = bandMax - ((localIndex + 1) % 3) * Math.max(1, Math.round((bandMax - bandMin) * 0.03));
  const first = pick(brandWords, localIndex + typeIndex * 5);
  const form = pick(brandForms, localIndex * 3 + typeIndex);
  const slug = `${slugify(`${first} ${config.suffix} ${form}`)}-${String(localIndex + 1).padStart(2, "0")}`;
  const displayForm = form.toLowerCase() === config.suffix.toLowerCase() ? "Retreat" : form;
  const businessName = `${first} ${config.suffix} ${displayForm}`;
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
    isPublic: true, imageUrl: `/demo-vendors/${slug}.svg`, imageAlt: `Illustrated demo cover for ${businessName}`,
  };
}

function vendorSetting(indoor, outdoor) {
  if (indoor && outdoor) return "indoor and open-air options";
  if (indoor) return "a dedicated indoor setting";
  return "an open-air setting";
}

function svgFor(vendor, index) {
  const [dark, accent, light] = pick(palettes, index);
  const categoryIndex = categories.findIndex(([slug]) => slug === vendor.categorySlug);
  const motif = [
    `<path d="M110 440V220c0-120 80-180 190-180s190 60 190 180v220" fill="none" stroke="${accent}" stroke-width="18"/><circle cx="300" cy="190" r="70" fill="none" stroke="${light}" stroke-width="3"/>`,
    `<rect x="95" y="75" width="410" height="300" rx="18" fill="none" stroke="${accent}" stroke-width="16"/><circle cx="300" cy="225" r="92" fill="none" stroke="${light}" stroke-width="4"/><circle cx="300" cy="225" r="28" fill="${accent}"/>`,
    `<path d="M65 245c70-130 115 130 190 0s120 130 190 0 75 55 90 0" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/><circle cx="300" cy="210" r="125" fill="none" stroke="${light}" stroke-width="3"/>`,
    `<path d="M300 60c80 65 145 130 145 220a145 145 0 01-290 0c0-90 65-155 145-220z" fill="none" stroke="${accent}" stroke-width="15"/><path d="M210 285c55-70 125-70 180 0" fill="none" stroke="${light}" stroke-width="4"/>`,
    `<g fill="none" stroke="${accent}" stroke-width="12"><circle cx="300" cy="205" r="50"/><circle cx="300" cy="125" r="50"/><circle cx="380" cy="205" r="50"/><circle cx="300" cy="285" r="50"/><circle cx="220" cy="205" r="50"/></g>`,
    `<path d="M90 320h420M130 280l100-110 70 70 85-120 85 160" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="430" cy="105" r="35" fill="${light}"/>`,
  ][categoryIndex];
  const safeName = vendor.businessName.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const safeType = vendor.subcategoryName.replaceAll("&", "&amp;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc"><title id="title">${safeName}</title><desc id="desc">Original abstract demo artwork for a fictional ${safeType.toLowerCase()} vendor.</desc><rect width="1200" height="900" fill="${dark}"/><circle cx="1030" cy="130" r="230" fill="${accent}" opacity=".14"/><circle cx="130" cy="800" r="310" fill="${light}" opacity=".08"/><g transform="translate(${60 + (index % 5) * 120} 85) rotate(${(index % 7) - 3} 300 220)">${motif}</g><path d="M0 ${520 + (index % 7) * 17}C260 ${430 + (index % 5) * 25} 620 ${700 - (index % 4) * 30} 1200 ${500 + (index % 6) * 24}V900H0z" fill="${light}" opacity=".96"/><text x="70" y="690" fill="${dark}" font-family="Georgia,serif" font-size="62" font-weight="700">${safeName}</text><text x="72" y="755" fill="${dark}" opacity=".72" font-family="Arial,sans-serif" font-size="25" letter-spacing="5">${safeType.toUpperCase()}</text><text x="72" y="812" fill="${dark}" opacity=".68" font-family="Arial,sans-serif" font-size="22">${vendor.locationCity} · FICTIONAL DEMO VENDOR</text></svg>\n`;
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

const categoryCounts = Object.fromEntries(categories.map(([slug]) => [slug, vendors.filter((vendor) => vendor.categorySlug === slug).length]));
const subcategoryCounts = Object.fromEntries(types.map((type) => [type.slug, vendors.filter((vendor) => vendor.subcategorySlug === type.slug).length]));
const geography = Object.fromEntries([...new Set(regions)].map((area) => [area, vendors.filter((vendor) => vendor.serviceAreas.includes(area)).length]));
geography.flexible = vendors.filter((vendor) => vendor.serviceAreas.includes("flexible")).length;
const homeBaseGeography = Object.fromEntries([...new Set(regions)].map((area) => [area, vendors.filter((vendor) => vendor.homeArea === area).length]));
const styles = Object.fromEntries([...new Set(vendors.flatMap((vendor) => vendor.styles))].sort().map((style) => [style, vendors.filter((vendor) => vendor.styles.includes(style)).length]));
const reviewDistribution = {
  none: vendors.filter((vendor) => vendor.reviewCount === 0).length,
  few_1_2: vendors.filter((vendor) => vendor.reviewCount >= 1 && vendor.reviewCount <= 2).length,
  several_3_7: vendors.filter((vendor) => vendor.reviewCount >= 3 && vendor.reviewCount <= 7).length,
  established_8_12: vendors.filter((vendor) => vendor.reviewCount >= 8 && vendor.reviewCount <= 12).length,
  high_13_plus: vendors.filter((vendor) => vendor.reviewCount >= 13).length,
};
const ratingDistribution = {
  unrated: vendors.filter((vendor) => vendor.ratingAverage == null).length,
  mixed_3_0_to_3_99: vendors.filter((vendor) => vendor.ratingAverage != null && vendor.ratingAverage < 4).length,
  positive_4_0_to_4_49: vendors.filter((vendor) => vendor.ratingAverage != null && vendor.ratingAverage >= 4 && vendor.ratingAverage < 4.5).length,
  highly_rated_4_5_to_5_0: vendors.filter((vendor) => vendor.ratingAverage != null && vendor.ratingAverage >= 4.5).length,
};
const priceRanges = Object.fromEntries(types.map((type) => { const rows = vendors.filter((vendor) => vendor.subcategorySlug === type.slug); return [type.slug, { minimumShekels: Math.min(...rows.map((row) => row.minPriceMinor)) / 100, maximumShekels: Math.max(...rows.map((row) => row.maxPriceMinor)) / 100, unit: type.slug === "wedding-venues" ? "per guest" : "package or service" }]; }));
const stats = { generatedAt: "deterministic-build", totalVendors: vendors.length, totalReviews: reviews.length, categoryCounts, subcategoryCounts, homeBaseGeography, serviceCoverage: geography, styles, reviewDistribution, ratingDistribution, priceRanges };

function validate() {
  if (vendors.length !== 432) throw new Error(`Expected 432 vendors, received ${vendors.length}.`);
  if (new Set(vendors.map((vendor) => vendor.id)).size !== vendors.length || new Set(vendors.map((vendor) => vendor.slug)).size !== vendors.length || new Set(vendors.map((vendor) => vendor.businessName)).size !== vendors.length) throw new Error("Vendor identifiers, slugs, and names must be unique.");
  if (types.some((type) => subcategoryCounts[type.slug] !== type.count || (type.slug === "wedding-venues" ? type.count < 30 : type.count < 20))) throw new Error("A subcategory vendor count is below its target.");
  for (const vendor of vendors) {
    const type = typeBySlug[vendor.subcategorySlug];
    if (!type || type.category !== vendor.categorySlug) throw new Error(`Category mismatch for ${vendor.slug}.`);
    if (vendor.minPriceMinor < 0 || vendor.minPriceMinor > vendor.maxPriceMinor) throw new Error(`Invalid price range for ${vendor.slug}.`);
    if (vendor.minGuestCapacity != null && vendor.minGuestCapacity > vendor.maxGuestCapacity) throw new Error(`Invalid capacity for ${vendor.slug}.`);
    if (!vendor.imageUrl.startsWith("/demo-vendors/") || !vendor.imageUrl.endsWith(".svg")) throw new Error(`Invalid image URL for ${vendor.slug}.`);
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
  [path.join(root, "src", "generated", "marketplace-stats.json"), `${JSON.stringify(stats, null, 2)}\n`],
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

const assetDirectory = path.join(root, "public", "demo-vendors");
if (!checkOnly) await mkdir(assetDirectory, { recursive: true });
for (const [index, vendor] of vendors.entries()) {
  const file = path.join(assetDirectory, `${vendor.slug}.svg`);
  const content = svgFor(vendor, index);
  if (checkOnly) {
    const current = await readFile(file, "utf8").catch(() => "");
    if (current !== content) throw new Error(`${path.relative(root, file)} is missing or stale.`);
  } else {
    await writeFile(file, content, "utf8");
  }
}
if (checkOnly) {
  const assets = (await readdir(assetDirectory)).filter((name) => name.endsWith(".svg"));
  if (assets.length !== vendors.length) throw new Error(`Expected ${vendors.length} SVG assets, found ${assets.length}.`);
}

console.log(`${checkOnly ? "Validated" : "Generated"} ${vendors.length} fictional vendors, ${reviews.length} fictional reviews, and ${vendors.length} local SVG assets.`);
