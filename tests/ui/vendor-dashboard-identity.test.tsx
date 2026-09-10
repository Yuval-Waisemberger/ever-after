import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VendorDashboardView } from "@/components/vendor/vendor-dashboard-view";
import type { getVendorDashboard } from "@/lib/queries/vendor-dashboard";
afterEach(()=>vi.unstubAllEnvs());
const dashboard = (path:string|null) => ({profile:{id:"vendor",business_name:"Studio",slug:"stable",profile_image_storage_path:path,is_public:false,vendor_images:[]},completion:{percentage:0,nextSteps:[]},rating:null,reviews:[]}) as unknown as NonNullable<Awaited<ReturnType<typeof getVendorDashboard>>>;
describe("Dashboard identity and owner preview",()=>{
  it("places the separate image beside the unchanged business heading",()=>{
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.test");
    const doc=new DOMParser().parseFromString(renderToStaticMarkup(<VendorDashboardView dashboard={dashboard("vendor/profile/logo.png")}/>),"text/html");
    const identity=doc.querySelector(".vendor-dashboard-identity")!;
    expect(identity.querySelector("h1")?.textContent).toBe("Studio");
    expect(identity.querySelector("img")?.getAttribute("src")).toContain("vendor%2Fprofile%2Flogo.png");
    expect(identity.querySelector("img")?.getAttribute("width")).toBe("64");
    expect([...doc.querySelectorAll("a")].filter(a=>a.textContent?.startsWith("Preview")).every(a=>a.getAttribute("href")==="/vendor/preview")).toBe(true);
  });
  it("keeps the existing Building2 icon and circle when identity is absent",()=>{
    const doc=new DOMParser().parseFromString(renderToStaticMarkup(<VendorDashboardView dashboard={dashboard(null)}/>),"text/html");
    const identity=doc.querySelector(".vendor-dashboard-identity")!;
    expect(identity.querySelector("img")).toBeNull();expect(identity.querySelector(".lucide-building2, .lucide-building-2")).not.toBeNull();
    expect(identity.querySelector("span")?.className).toContain("rounded-full bg-wine/10 text-wine");
  });
});
