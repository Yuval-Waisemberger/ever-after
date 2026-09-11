// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ account: null as null | {id:string;role:string}, rows: [] as Array<Record<string,unknown>>, selections: [] as string[], from: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({getCurrentProfile:async()=>m.account, requireRole:async(role:string)=>{if(m.account?.role!==role)throw new Error("unauthorized");return m.account;}}));
vi.mock("@/lib/supabase/config",()=>({isSupabaseConfigured:()=>true}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({from:m.from})}));
import { getMarketplace, getVendorBySlug, getOwnedVendorPreview } from "@/lib/queries/vendors";
beforeEach(()=>{
  vi.clearAllMocks();m.account=null;m.selections=[];
  m.rows=[{id:"vendor",owner_user_id:"owner",slug:"stable",business_name:"Studio",is_public:false,vendor_categories:null,vendor_subcategories:null,vendor_images:[{id:"photo",storage_path:"vendor/gallery.jpg",external_url:null,alt_text:"Work",sort_order:0,is_primary:true}],services:["Photography"],service_areas:["north"],email:"public@example.test",contact_name:"Private account contact",profile_image_storage_path:"vendor/profile/identity.jpg",reviews:[]}];
  m.from.mockImplementation((table:string)=>{
    const tableRows=()=>table === "public_vendor_profiles" ? m.rows.filter(r=>r.is_public).map(r=>({...r,category_slug:null,category_name:null,subcategory_slug:null,subcategory_name:null}))
      : table === "public_vendor_images" ? m.rows.filter(r=>r.is_public).flatMap(r=>(r.vendor_images as Array<Record<string,unknown>>).map(image=>({...image,vendor_id:r.id})))
      : table === "public_vendor_reviews" || table === "vendor_owner_reviews" ? []
      : m.rows;
    const predicates:Array<(r:Record<string,unknown>)=>boolean>=[];
    const result=()=>({data:tableRows().filter(r=>predicates.every(p=>p(r))),error:null,count:tableRows().filter(r=>predicates.every(p=>p(r))).length});
    const chain={select:(s:string)=>{m.selections.push(s);return chain;},eq:(key:string,value:unknown)=>{predicates.push(r=>r[key]===value);return chain;},in:(key:string,values:unknown[])=>{predicates.push(r=>values.includes(r[key]));return chain;},order:()=>chain,range:()=>chain,limit:()=>chain,maybeSingle:async()=>({...result(),data:result().data[0]??null}),then:(resolve:(value:ReturnType<typeof result>)=>void)=>resolve(result())};return chain;
  });
});
describe("Vendor publication and owner preview boundary",()=>{
  it("previews private canonical data for the owner without exposing account-only fields or using identity as gallery",async()=>{
    m.account={id:"owner",role:"vendor"};const vendor=await getOwnedVendorPreview();
    expect(vendor).toMatchObject({id:"vendor",businessName:"Studio",services:["Photography"],serviceAreas:["north"],email:"public@example.test"});
    expect(vendor?.gallery[0].url).toContain("vendor/gallery.jpg");
    expect(vendor).not.toHaveProperty("contact_name");expect(vendor).not.toHaveProperty("profile_image_storage_path");
    expect(m.selections[0]).not.toContain("!inner");
  });
  it("denies guests and Couples before querying private data",async()=>{
    await expect(getOwnedVendorPreview()).rejects.toThrow("unauthorized");
    m.account={id:"couple",role:"couple"};await expect(getOwnedVendorPreview()).rejects.toThrow("unauthorized");expect(m.from).not.toHaveBeenCalled();
  });
  it("another Vendor cannot preview the private owner record",async()=>{
    m.account={id:"other",role:"vendor"};expect(await getOwnedVendorPreview()).toBeNull();
  });
  it("keeps private public URLs blocked for guests and authenticated accounts including owner",async()=>{
    for(const account of [null,{id:"owner",role:"vendor"},{id:"other",role:"vendor"}]){m.account=account;expect(await getVendorBySlug("stable")).toBeNull();}
  });
  it("exposes the same public row and stable slug, including without category, then removes it on unpublish",async()=>{
    expect((await getMarketplace({page:1})).total).toBe(0);
    m.rows[0].is_public=true;
    expect((await getMarketplace({page:1})).vendors.map(v=>v.id)).toEqual(["vendor"]);
    expect(await getVendorBySlug("stable")).toMatchObject({id:"vendor",categoryName:"Vendor"});
    expect(m.selections.every(s=>!s.includes("vendor_categories!inner"))).toBe(true);
    m.rows[0].is_public=false;
    expect((await getMarketplace({page:1})).total).toBe(0);expect(await getVendorBySlug("stable")).toBeNull();expect(m.rows).toHaveLength(1);
  });
  it("retains parent category filtering when a category is requested",async()=>{
    await getMarketplace({page:1,category:"venues"});expect(m.selections[0]).toContain("category_slug");
  });
});
