import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { demoVendors } from "@/lib/vendors/demo";

vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/queries/couple-vendors", () => ({ getVendorRelationship: vi.fn() }));
vi.mock("@/lib/actions/vendors", () => ({ setMarketplaceVendorSaved: vi.fn(), setRelationshipSaved: vi.fn(), setVendorStatus: vi.fn() }));

import { VendorCard } from "@/components/vendors/vendor-card";
import { VendorProfilePresentation } from "@/components/vendors/vendor-profile-presentation";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const fixed = demoVendors.find(vendor => vendor.locationMode === "fixed")!;
const mobile = demoVendors.find(vendor => vendor.locationMode === "mobile" && vendor.locationCity && vendor.serviceAreas.includes("jerusalem"))!;

describe("Vendor location presentation", () => {
  it("renders a fixed card with city only and no service row", () => {
    const document = parse(renderToStaticMarkup(<VendorCard vendor={fixed} />));
    expect(document.body.textContent).toContain(`${fixed.locationCity}, Israel`);
    expect(document.body.textContent).not.toContain("Serves:");
  });

  it("renders a mobile card with separate city and labeled service rows", () => {
    const document = parse(renderToStaticMarkup(<VendorCard vendor={mobile} />));
    const location = [...document.querySelectorAll(".vendor-card span")].find(node => node.textContent === `${mobile.locationCity}, Israel`);
    const coverage = [...document.querySelectorAll(".vendor-card span")].find(node => node.textContent?.startsWith("Serves:"));
    expect(location).toBeDefined();
    expect(coverage?.textContent).toContain("Jerusalem Area");
    expect(location).not.toBe(coverage);
  });

  it("separates fixed physical area and mobile service coverage on public profiles", async () => {
    const fixedDocument = parse(renderToStaticMarkup(await VendorProfilePresentation({ vendor: fixed, ownerPreview: true })));
    expect(fixedDocument.body.textContent).toContain(`Physical area:`);
    expect(fixedDocument.body.textContent).not.toContain("Serves:");

    const mobileDocument = parse(renderToStaticMarkup(await VendorProfilePresentation({ vendor: mobile, ownerPreview: true })));
    expect(mobileDocument.body.textContent).toContain(`${mobile.locationCity}, Israel`);
    expect(mobileDocument.body.textContent).toContain("Serves:");
    expect(mobileDocument.body.textContent).not.toContain("Physical area:");
  });
});
