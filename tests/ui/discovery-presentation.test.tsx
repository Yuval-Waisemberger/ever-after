import {describe,it,expect,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
vi.mock("@/lib/actions/vendors",()=>({setVendorStatus:vi.fn(),setMarketplaceVendorSaved:vi.fn(),setRelationshipSaved:vi.fn(),saveExternalVendor:vi.fn(),deleteExternalVendor:vi.fn()}));
import {BookingFeedback,BookingCelebration} from "@/components/vendors/booking-celebration";
import {RecommendationDetail} from "@/components/vendors/recommendation-detail";
import {VendorStatusActions} from "@/components/vendors/vendor-status-actions";
import {VendorFiltersForm} from "@/components/vendors/vendor-filters";
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
  it("does not fabricate a recommendation or reasons",()=>{
    expect(renderToStaticMarkup(<RecommendationDetail/>)).toBe("");
    expect(renderToStaticMarkup(<RecommendationDetail recommendation={{isRecommended:false,score:90,applicableDimensions:[],reasons:[]}}/>)).toBe("");
    const doc=parse(renderToStaticMarkup(<RecommendationDetail recommendation={{isRecommended:true,score:80,applicableDimensions:["area","budget"],reasons:[{dimension:"area",label:"Serves your area",earnedWeight:25,availableWeight:25},{dimension:"budget",label:"Not supported",earnedWeight:0,availableWeight:20}]}}/>));
    expect(doc.querySelectorAll("li")).toHaveLength(1);expect(doc.querySelector("li")?.textContent).toBe("Serves your area");expect(doc.querySelector("summary")).not.toBeNull();
  });
  it("keeps bookmark and lifecycle forms independent, without changing quick-action inputs",()=>{
    const doc=parse(renderToStaticMarkup(<VendorStatusActions vendorId="vendor-id" currentStatus="considering" isSaved returnTo="/vendors/studio"/>));
    expect(doc.querySelectorAll("form")).toHaveLength(6);
    const forms=[...doc.querySelectorAll("form")];expect(forms[0].querySelector('[name="isSaved"]')?.getAttribute("value")).toBe("false");
    expect(forms.slice(1).map(f=>f.querySelector('[name="status"]')?.getAttribute("value"))).toEqual(["saved","contacted","considering","booked","rejected"]);
    expect(doc.querySelector('[name="payment"], [name="weddingId"], [name="source"]')).toBeNull();
  });
  it("only accepts scoped price sorts and retains the directory default otherwise",()=>{
    expect(parseVendorFilters({sort:"price_asc",category:"venues"}).sort).toBe("price_asc");
    expect(parseVendorFilters({sort:"price_desc"}).sort).toBeUndefined();
    expect(parseVendorFilters({sort:"invented",category:"venues"}).sort).toBeUndefined();
    const doc=parse(renderToStaticMarkup(<VendorFiltersForm filters={{page:1}} subcategories={[]}/>));
    expect(doc.querySelectorAll('select[name="sort"] option')).toHaveLength(1);
    expect(doc.querySelector('select[name="category"]')).toBeNull();
  });
});
