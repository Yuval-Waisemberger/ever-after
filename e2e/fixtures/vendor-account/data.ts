import type { OwnedVendorProfile, VendorTaxonomy } from "@/lib/queries/vendor-dashboard";
import type { ActionState } from "@/lib/actions/state";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";
const empty = new URLSearchParams(location.search).has("empty");
export const profile: OwnedVendorProfile = {
  id: "isolated-vendor", slug: "willow-studio", business_name: "Willow Studio", contact_name: "Dana", description: null,
  location_city: "Tel Aviv", category_id: "photo", subcategory_id: "stills", service_areas: ["central_israel"], min_price_minor: null, max_price_minor: null,
  services: [], styles: ["Elegant"], event_types: ["friday_afternoon"], min_guest_capacity: null, max_guest_capacity: null, friday_available: true,
  indoor_available: false, outdoor_available: true, phone: null, email: "studio@example.test", website_url: "", instagram_url: "", is_public: false,
  vendor_images: [{id:"image",external_url:"/images/auth/hands-and-rings.webp",storage_path:null,alt_text:"Editorial hands and rings",sort_order:0,is_primary:true}],
  reviews: empty ? [] : [
    { id:"r1", reviewer_display_name:"Noa & Daniel", professionalism:5,punctuality:4,service_attitude:5,value_for_money:4,would_choose_again:true,review_text:"A calm presence and a beautiful eye for the moments that mattered. We felt completely ourselves.",created_at:"2026-08-12T09:00:00Z" },
    { id:"r2", reviewer_display_name:"מיה ועומר", professionalism:4,punctuality:5,service_attitude:4,value_for_money:4,would_choose_again:true,review_text:"תודה על הסבלנות, תשומת הלב והזיכרונות היפים מהיום שלנו.",created_at:"2026-08-01T09:00:00Z" },
  ],
};
export const fixture = { fail: false, hold: false, resolve: undefined as undefined | (()=>void), writes:0 };
export const refresh = () => window.dispatchEvent(new Event("fixture-refresh"));
export const getOwnedVendorProfile = async () => new URLSearchParams(location.search).has("new") ? null : ({...profile});
export const getVendorTaxonomy = async (): Promise<VendorTaxonomy> => [{id:"photo",name:"Photography & Content",slug:"photography-content",vendor_subcategories:[{id:"stills",name:"Wedding Photographers",slug:"wedding-photographers"}]}];
export async function getVendorDashboard() {
  const reviews=profile.reviews ?? [];
  return {profile:{...profile},reviews,rating:reviews.length ? reviews.reduce((sum,r)=>sum+(r.professionalism+r.punctuality+r.service_attitude+r.value_for_money)/4,0)/reviews.length:null,
    completion:calculateVendorProfileCompletion({businessName:profile.business_name,description:profile.description,categoryId:profile.category_id,subcategoryId:profile.subcategory_id,serviceAreas:profile.service_areas,minPriceMinor:profile.min_price_minor==null?null:Number(profile.min_price_minor),maxPriceMinor:profile.max_price_minor==null?null:Number(profile.max_price_minor),services:profile.services,email:profile.email,imageCount:profile.vendor_images?.length})};
}
export async function saveVendorProfile(_state:ActionState,data:FormData):Promise<ActionState> {
  fixture.writes++; refresh();
  if(fixture.hold) await new Promise<void>(resolve=>{fixture.resolve=resolve;});
  if(fixture.fail) return {status:"error",message:"The business profile could not be saved."};
  profile.description=String(data.get("description")??""); profile.business_name=String(data.get("businessName"));
  profile.services=String(data.get("services")??"").split(",").map(s=>s.trim()).filter(Boolean);
  profile.min_price_minor=data.get("minPriceShekels")?Number(data.get("minPriceShekels"))*100:null;
  profile.max_price_minor=data.get("maxPriceShekels")?Number(data.get("maxPriceShekels"))*100:null;
  profile.is_public=data.get("isPublic")==="on"; refresh();
  return {status:"success",message:"Business profile updated."};
}
export async function signOut() { throw new Error("Authentication disabled in fixture"); }
export function createClient(): never { throw new Error("Storage/network disabled in fixture"); }
export async function registerVendorImage() { throw new Error("Uploads disabled in fixture"); }
export async function deleteVendorImage() { throw new Error("Deletes disabled in fixture"); }
