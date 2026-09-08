import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/lib/actions/vendor-profile",()=>({saveVendorProfile:vi.fn()}));
import { VendorCompletion } from "@/components/vendor/vendor-completion";
import { VendorStars, VendorNumber } from "@/components/vendor/vendor-motion";
import { VendorSaveFeedback } from "@/components/vendor/vendor-save-feedback";
import { VendorProfileForm } from "@/components/vendor/vendor-profile-form";
const parse=(html:string)=>new DOMParser().parseFromString(html,"text/html");
describe("Vendor presentation retains saved truth",()=>{
  it("renders all eight checklist links with meaningful, distinct targets",()=>{
    const doc=parse(renderToStaticMarkup(<VendorCompletion profileId="test" percentage={38} nextSteps={["Write a description"]} imageCount={1}/>));
    expect(doc.querySelectorAll("li a")).toHaveLength(8);
    expect(new Set([...doc.querySelectorAll("li a")].map(a=>a.getAttribute("href"))).size).toBe(8);
    expect(doc.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("38");
    expect(doc.querySelector('[data-just-completed="true"]')).toBeNull();
  });
  it.each([0,2.5,4.25,5])("preserves exact partial star fill for %s",rating=>{
    const doc=parse(renderToStaticMarkup(<VendorStars rating={rating}/>));
    const widths=[...doc.querySelectorAll<HTMLElement>(".vendor-star-fill")].map(e=>parseFloat(e.style.width));
    expect(widths.reduce((a,b)=>a+b,0)).toBe(rating*100);
    expect(doc.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(`${rating.toFixed(1)} out of 5 stars`);
  });
  it("SSR and assistive technology see final actual values",()=>{
    const doc=parse(renderToStaticMarkup(<VendorNumber value={4.375} decimals={1}/>));
    expect(doc.body.textContent).toBe("4.4");expect(doc.querySelector('[aria-label="4.4"]')).not.toBeNull();
  });
  it.each(["idle","error"] as const)("does not celebrate %s",status=>{
    expect(renderToStaticMarkup(<VendorSaveFeedback state={{status,publishedNow:true}} pending={false}/>)).toBe("");
  });
  it("does not show success during pending or ordinary successful saves",()=>{
    expect(renderToStaticMarkup(<VendorSaveFeedback state={{status:"success",publishedNow:true}} pending/>)).toBe("");
    const doc=parse(renderToStaticMarkup(<VendorSaveFeedback state={{status:"success"}} pending={false}/>));
    expect(doc.querySelector(".vendor-publish-success")).toBeNull();expect(doc.body.textContent).toContain("Business profile saved");
  });
  it("publication success uses compact feedback without confetti",()=>{
    const doc=parse(renderToStaticMarkup(<VendorSaveFeedback state={{status:"success",publishedNow:true}} pending={false} slug="studio"/>));
    expect(doc.querySelector('a[href="/vendors/studio"]')).not.toBeNull();expect(doc.body.textContent).toContain("Your profile is live");expect(doc.querySelector('[class*="confetti"]')).toBeNull();
  });
  it("human readable labels preserve original submitted identifiers and explicit save",()=>{
    const doc=parse(renderToStaticMarkup(<VendorProfileForm profile={null} taxonomy={[]}/>));
    expect(doc.querySelector('input[value="friday_afternoon"]')?.parentElement?.textContent).toBe("FRIDAY AFTERNOON");
    expect(doc.querySelector('input[value="central_israel"]')?.parentElement?.textContent).toBe("CENTRAL ISRAEL");
    expect(doc.querySelector('input[name="isPublic"]')?.getAttribute("role")).toBe("switch");
    expect(doc.querySelectorAll("form")).toHaveLength(1);expect(doc.querySelector('[name="ownerUserId"]')).toBeNull();
    expect(doc.querySelector('button[type="submit"]')?.textContent).toContain("Create business profile");
  });
  it.each([[49,null],[50,"Halfway there"],[75,"finishing touches"],[100,"ready to shine"]] as const)("milestone %s is presentation-only",(percentage,phrase)=>{
    const doc=parse(renderToStaticMarkup(<VendorCompletion profileId="milestones" percentage={percentage} nextSteps={[]} imageCount={3}/>));
    if (phrase) expect(doc.querySelector(".vendor-milestone")?.textContent).toContain(phrase);
    else expect(doc.querySelector(".vendor-milestone")).toBeNull();
  });

});
