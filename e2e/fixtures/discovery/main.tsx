import { AppShell } from "@/components/layout/app-shell";
import { PublicHeader } from "./header";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { VendorCard } from "@/components/vendors/vendor-card";
import { VendorResults } from "@/components/vendors/vendor-results";
import { CategoryNavigation } from "@/components/vendors/category-navigation";
import { VendorFiltersForm } from "@/components/vendors/vendor-filters";
import { VendorProfilePresentation } from "@/components/vendors/vendor-profile-presentation";
import DirectoryPage from "@/app/vendors/page";
import MyVendorsPage from "@/app/(couple)/vendors/my/page";
import { VendorStatusActions } from "@/components/vendors/vendor-status-actions";
import { fixture, vendor, refresh } from "./data";
import type { MarketplaceVendor } from "@/lib/vendors/types";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/app/public.css";
import "@/app/marketplace-polish.css";

function Fixture() {
  const [revision, render] = useState(0), [page, setPage] = useState<ReactNode>(null);
  const view = new URLSearchParams(location.search).get("view");
  const vendorCount = view === "quick-save-scroll" ? 24 : 4;
  const listedVendor = view === "fixed" ? { ...vendor, subcategorySlug: "wedding-venues", subcategoryName: "Wedding Venues & Gardens", locationMode: undefined } as unknown as MarketplaceVendor : vendor;
  useEffect(() => {const update=()=>render(n=>n+1);window.addEventListener("fixture-refresh",update);return()=>window.removeEventListener("fixture-refresh",update);},[]);
  useEffect(() => { if(view === "directory-page") void DirectoryPage({params:Promise.resolve({}),searchParams:Promise.resolve({category:"photography-content"})}).then(setPage); if(view === "profile") void VendorProfilePresentation({vendor,query:{}}).then(setPage); if(view === "my") void MyVendorsPage({params:Promise.resolve({}),searchParams:Promise.resolve({})}).then(setPage); },[revision,view]);
  const content = <>
    <div className="flex flex-wrap gap-3 p-3 text-xs" aria-label="Fixture controls"><span>Isolated synthetic fixture · writes: {fixture.writes}</span><button onClick={()=>{fixture.fail=!fixture.fail;refresh();}}>Toggle failure</button><button onClick={()=>{fixture.hold=!fixture.hold;refresh();}}>Toggle pending</button><button onClick={()=>fixture.pending?.()}>Resolve request</button><button onClick={()=>{fixture.status="booked";refresh();}}>Receive unrelated booked state</button></div>
    {view === "profile" || view === "my" ? page : view === "actions" ? <main className="mx-auto max-w-xl p-6"><h1 className="mb-6 font-display text-3xl">Willow Studio</h1><VendorStatusActions businessName={vendor.businessName} vendorId={vendor.id} currentStatus={fixture.status} isSaved={fixture.saved} returnTo="/" /></main> : <main className="public-theme directory-page mx-auto max-w-7xl p-6">
      <PublicHeader /><h1 className="mb-8 text-center font-display text-4xl">Find your wedding people</h1><CategoryNavigation selected="photography-content" />
      <section className="marketplace-results"><VendorFiltersForm filters={{page:1,category:"photography-content"}} subcategories={[{slug:"wedding-photographers",name:"Wedding photographers",categorySlug:"photography-content"}]} />
        <VendorResults>{Array.from({ length: vendorCount }, (_, i)=><VendorCard key={i} vendor={{...listedVendor,id:listedVendor.id+i,businessName:i===0?listedVendor.businessName:`Willow Studio ${i+1}`,isSaved:fixture.saved,recommendation:i===0?listedVendor.recommendation:null}} canSave={i!==vendorCount-1} />)}</VendorResults>
      </section>
    </main>}
  </>;
  if(view === "directory-page") return page;
  return new URLSearchParams(location.search).has("shell") ? <AppShell role="couple" displayName="Alex & Sam">{content}</AppShell> : content;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
