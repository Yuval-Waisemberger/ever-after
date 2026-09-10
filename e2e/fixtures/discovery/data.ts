import { demoVendors } from "@/lib/vendors/demo";
const base = demoVendors.find(v=>v.categorySlug === "photography-content")!;
export const fixture = { saved: false, status: "considering", fail: false, hold: false, pending: null as (()=>void) | null, writes: 0 };
export const vendor: import("@/lib/vendors/types").MarketplaceVendor = {...base, businessName: "Willow Studio", recommendation: {isRecommended:true,score:90,applicableDimensions:["area","style"],reasons:[{dimension:"area" as const,label:"Serves your area",earnedWeight:25,availableWeight:25},{dimension:"style" as const,label:"Matches your style",earnedWeight:20,availableWeight:20}]}};
export const taxonomy = [{ id:"category", name:"Photography & Content", slug:"photography-content", vendor_subcategories:[{id:"subcategory",name:"Wedding photographers",slug:"wedding-photographers"}] }];
export const refresh = () => window.dispatchEvent(new Event("fixture-refresh"));
export async function getCurrentProfile(){return new URLSearchParams(location.search).has("guest") ? null : {role:"couple",displayName:"Fixture Couple"};}
export async function requireRole(){return {id:"fixture-user",role:"couple",displayName:"Fixture Couple"};}
export async function getMarketplace(){return {vendors:[0,1,2,3].map(i=>({...vendor,id:vendor.id+i,businessName:i===0?vendor.businessName:`Willow Studio ${i+1}`})),total:4,pageSize:12,isPreview:true};}
export async function getMarketplaceSubcategories(){return [{slug:"wedding-photographers",name:"Wedding photographers",categorySlug:"photography-content"}];}
export async function getVendorBySlug(){return vendor;}
export async function getVendorRelationship(){return {status:fixture.status,is_saved:fixture.saved};}
export async function getCoupleVendorTaxonomy(){return taxonomy;}
export async function getMyVendors(){return [{id:"relationship",vendor_id:vendor.id,status:fixture.status,is_saved:fixture.saved,agreed_price_minor:null,private_notes:null,vendor_profiles:{business_name:vendor.businessName,slug:vendor.slug,vendor_categories:{name:vendor.categoryName},vendor_subcategories:{name:vendor.subcategoryName},vendor_images:[{is_primary:true,external_url:vendor.imageUrl,alt_text:vendor.imageAlt}]},external_vendors:null}];}
