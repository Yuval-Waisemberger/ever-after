import {describe,it,expect,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
vi.mock("@/lib/actions/vendors",()=>({setVendorStatus:vi.fn(),setMarketplaceVendorSaved:vi.fn(),setRelationshipSaved:vi.fn(),saveExternalVendor:vi.fn(),deleteExternalVendor:vi.fn()}));
import {BookingFeedback,BookingCelebration} from "@/components/vendors/booking-celebration";
import {RecommendationBadge} from "@/components/vendors/recommendation-detail";
import {VendorStatusActions} from "@/components/vendors/vendor-status-actions";
import {VendorFiltersForm} from "@/components/vendors/vendor-filters";
import {SavedVendorButton} from "@/components/vendors/saved-vendor-button";
import {parseVendorFilters} from "@/lib/vendors/filters";
const parse=(html:string)=>new DOMParser().parseFromString(html,"text/html");

describe("discovery presentation boundaries",()=>{
  it.each(["booked","considering",null])("never celebrates initial stored status %s",status=>{
    expect(parse(renderToStaticMarkup(<BookingFeedback status={status} businessName="Real vendor"><p>Details</p></BookingFeedback>)).querySelector(".booking-celebration")).toBeNull();
  });
  it("renders actual vendor name, decorative one-burst particles and a usable next action",()=>{
    const doc=parse(renderToStaticMarkup(<BookingCelebration businessName="Willow Photography"/>));
    expect(doc.querySelector('[role="status"]')?.textContent).toContain("Willow Photography");
    expect(doc.querySelectorAll(".booking-confetti[aria-hidden=true] > span")).toHaveLength(16);
    expect(doc.querySelector('a[href="/vendors/my"]')).not.toBeNull();
  });
  it("shows only the eligible recommendation badge and never exposes reasons",()=>{
    expect(renderToStaticMarkup(<RecommendationBadge/>)).toBe("");
    expect(renderToStaticMarkup(<RecommendationBadge recommendation={{isRecommended:false,score:90,applicableDimensions:[],reasons:[]}}/>)).toBe("");
    const doc=parse(renderToStaticMarkup(<RecommendationBadge recommendation={{isRecommended:true,score:80,applicableDimensions:["area","budget"],reasons:[{dimension:"area",label:"Serves your area",earnedWeight:25,availableWeight:25},{dimension:"budget",label:"Not supported",earnedWeight:0,availableWeight:20}]}}/>));
    expect(doc.body.textContent?.trim()).toBe("Recommended for you");
    expect(doc.querySelector(".recommendation-badge")).not.toBeNull();
    expect(doc.querySelector("details, summary, li, .recommendation-reasons")).toBeNull();
  });
  it("keeps the compact favorite shell neutral and fills only the saved heart",()=>{
    const unsaved=parse(renderToStaticMarkup(<SavedVendorButton vendorId="vendor-id" isSaved={false} returnTo="/vendors" compact/>));
    const saved=parse(renderToStaticMarkup(<SavedVendorButton vendorId="vendor-id" isSaved returnTo="/vendors" compact/>));
    const unsavedButton=unsaved.querySelector("button")!,savedButton=saved.querySelector("button")!;
    expect(unsavedButton.className).toContain("bg-paper/90 text-wine");
    expect(savedButton.className).toContain("bg-paper/90 text-wine");
    expect(savedButton.className).not.toContain("bg-wine text-white");
    expect(unsavedButton.querySelector("svg")?.getAttribute("class")).not.toContain("fill-current");
    expect(savedButton.querySelector("svg")?.getAttribute("class")).toContain("fill-current");
    expect(unsavedButton.getAttribute("aria-pressed")).toBe("false");
    expect(savedButton.getAttribute("aria-pressed")).toBe("true");
    expect(unsaved.querySelector<HTMLInputElement>('[name="preserveScroll"]')?.value).toBe("true");
  });
  it("keeps bookmark and lifecycle forms independent, without changing quick-action inputs",()=>{
    const doc=parse(renderToStaticMarkup(<VendorStatusActions vendorId="vendor-id" currentStatus="considering" isSaved returnTo="/vendors/studio"/>));
    expect(doc.querySelectorAll("form")).toHaveLength(6);
    const forms=[...doc.querySelectorAll("form")];expect(forms[0].querySelector('[name="isSaved"]')?.getAttribute("value")).toBe("false");
    expect(forms[0].querySelector('[name="preserveScroll"]')).toBeNull();
    expect(forms.slice(1).map(f=>f.querySelector('[name="status"]')?.getAttribute("value"))).toEqual(["saved","contacted","considering","booked","rejected"]);
    expect(doc.querySelector('[name="payment"], [name="weddingId"], [name="source"]')).toBeNull();
  });
  it("only accepts scoped price sorts and retains the directory default otherwise",()=>{
    expect(parseVendorFilters({sort:"price_asc",category:"venues"}).sort).toBe("price_asc");
    expect(parseVendorFilters({sort:"price_desc"}).sort).toBeUndefined();
    expect(parseVendorFilters({sort:"invented",category:"venues"}).sort).toBeUndefined();
    const doc=parse(renderToStaticMarkup(<VendorFiltersForm filters={{page:1}} subcategories={[]}/>));
    expect(doc.querySelector('select[name="sort"]')).toBeNull();
    expect(doc.body.textContent).not.toContain("Display by");
    expect(doc.querySelector('select[name="category"]')).toBeNull();
    const preserved=parse(renderToStaticMarkup(<VendorFiltersForm filters={{page:1,category:"venues",sort:"price_asc"}} subcategories={[]}/>));
    expect(preserved.querySelector<HTMLInputElement>('input[type="hidden"][name="sort"]')?.value).toBe("price_asc");
  });
});
