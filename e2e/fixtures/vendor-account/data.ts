import type { OwnedVendorProfile, VendorTaxonomy } from "@/lib/queries/vendor-dashboard";
import type { ActionState } from "@/lib/actions/state";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";
const params = new URLSearchParams(location.search);
const empty = params.has("empty");
const sparse = params.has("sparse");
export const profile: OwnedVendorProfile = {
  id: "isolated-vendor", slug: "willow-studio", business_name: "Willow Studio", contact_name: sparse ? null : "Dana", description: null,
  profile_image_storage_path: null,
  location_city: sparse ? null : "Tel Aviv", location_mode: "mobile", physical_area: null, category_id: sparse ? null : "photo", subcategory_id: sparse ? null : "stills", service_areas: sparse ? [] : ["central_israel"], min_price_minor: null, max_price_minor: null,
  services: [], styles: sparse ? [] : ["Elegant"], event_types: sparse ? [] : ["friday_afternoon"], min_guest_capacity: null, max_guest_capacity: null, friday_available: sparse ? false : true,
  indoor_available: false, outdoor_available: sparse ? false : true, phone: null, email: sparse ? null : "studio@example.test", website_url: "", instagram_url: "", is_public: false,
  vendor_images: [{id:"image",external_url:"/images/auth/hands-and-rings.webp",storage_path:null,alt_text:"Editorial hands and rings",sort_order:0,is_primary:true}],
  reviews: empty ? [] : [
    { id:"r1", reviewer_display_name:"Noa & Daniel", professionalism:5,punctuality:4,service_attitude:5,value_for_money:4,would_choose_again:true,review_text:"A calm presence and a beautiful eye for the moments that mattered. We felt completely ourselves.",created_at:"2026-08-12T09:00:00Z" },
    { id:"r2", reviewer_display_name:"מיה ועומר", professionalism:4,punctuality:5,service_attitude:4,value_for_money:4,would_choose_again:true,review_text:"תודה על הסבלנות, תשומת הלב והזיכרונות היפים מהיום שלנו.",created_at:"2026-08-01T09:00:00Z" },
  ],
};
export const fixture = { fail: false, imageFail: false, hold: false, resolve: undefined as undefined | (()=>void), writes:0, profileWrites: 0, imageWrites: 0, uploads: 0, lastUpload: null as null | { bucket: string; path: string }, lastSubmission: [] as Array<[string,string]> };
export const refresh = () => window.dispatchEvent(new Event("fixture-refresh"));
const persistedProfile = () => {
  const saved = window.localStorage.getItem("vendor-account-profile");
  return saved ? ({ ...profile, ...JSON.parse(saved) } as OwnedVendorProfile) : profile;
};
export const getOwnedVendorProfile = async () => new URLSearchParams(location.search).has("new") ? null : ({...persistedProfile()});
export const getVendorTaxonomy = async (): Promise<VendorTaxonomy> => [{id:"photo",name:"Photography & Content",slug:"photography-content",vendor_subcategories:[{id:"stills",name:"Wedding Photographers",slug:"wedding-photographers"},{id:"video",name:"Wedding Videographers",slug:"wedding-videographers"}]}];
export async function getVendorDashboard() {
  const current = persistedProfile(), reviews=current.reviews ?? [];
  return {profile:{...current},reviews,rating:reviews.length ? reviews.reduce((sum,r)=>sum+(r.professionalism+r.punctuality+r.service_attitude+r.value_for_money)/4,0)/reviews.length:null,
    completion:calculateVendorProfileCompletion({businessName:current.business_name,description:current.description,categoryId:current.category_id,subcategoryId:current.subcategory_id,serviceAreas:current.service_areas,minPriceMinor:current.min_price_minor==null?null:Number(current.min_price_minor),maxPriceMinor:current.max_price_minor==null?null:Number(current.max_price_minor),services:current.services,email:current.email,imageCount:current.vendor_images?.length})};
}
export async function saveVendorProfile(_state:ActionState,data:FormData):Promise<ActionState> {
  fixture.writes++; fixture.profileWrites++; fixture.lastSubmission = [...data.entries()].map(([key,value]) => [key, String(value)]); refresh();
  if(fixture.hold) await new Promise<void>(resolve=>{fixture.resolve=resolve;});
  if(fixture.fail) return {status:"error",message:"The business profile could not be saved."};
  const current = persistedProfile();
  const categoryChoice = String(data.get("categoryChoice") ?? "");
  const [categoryId, subcategoryId] = categoryChoice.split(":");
  const saved = {
    ...current,
    business_name: String(data.get("businessName") ?? "").trim() || current.business_name,
    contact_name: String(data.get("contactName") ?? "") || null,
    description: String(data.get("description") ?? "") || null,
    category_id: categoryId || null,
    subcategory_id: subcategoryId || null,
    service_areas: data.getAll("serviceAreas").map(String),
    min_price_minor: data.get("minPriceShekels") ? Number(data.get("minPriceShekels")) * 100 : null,
    max_price_minor: data.get("maxPriceShekels") ? Number(data.get("maxPriceShekels")) * 100 : null,
    services: String(data.get("services") ?? "").split(",").map(s=>s.trim()).filter(Boolean),
    styles: data.getAll("styles").map(String),
    event_types: data.getAll("eventTypes").map(String),
    min_guest_capacity: data.get("minGuestCapacity") ? Number(data.get("minGuestCapacity")) : null,
    max_guest_capacity: data.get("maxGuestCapacity") ? Number(data.get("maxGuestCapacity")) : null,
    friday_available: data.get("fridayAvailable") === "on",
    indoor_available: data.get("indoorAvailable") === "on",
    outdoor_available: data.get("outdoorAvailable") === "on",
    is_public: data.get("isPublic") === "on",
  } satisfies OwnedVendorProfile;
  Object.assign(profile, saved);
  window.localStorage.setItem("vendor-account-profile", JSON.stringify(saved));
  refresh();
  return {status:"success",message:"Business profile updated."};
}
export async function signOut() { throw new Error("Authentication disabled in fixture"); }
export function createClient() {
  return { storage: { from: (bucket: string) => ({ upload: async (path: string) => {
    fixture.uploads++; fixture.lastUpload = { bucket, path }; refresh();
    return { error: null };
  } }) } };
}
export async function registerVendorImage() { throw new Error("Uploads disabled in fixture"); }
export async function deleteVendorImage(data: FormData): Promise<ActionState> {
  fixture.writes++; refresh();
  if (fixture.hold) await new Promise<void>(resolve=>{fixture.resolve=resolve;});
  if (fixture.fail) return {status:"error",message:"The image could not be removed."};
  const current = persistedProfile();
  const imageId = String(data.get("imageId") ?? "");
  const images = current.vendor_images ?? [];
  if (!images.some(image => image.id === imageId)) return {status:"error",message:"The image could not be removed."};
  const saved = {...current,vendor_images:images.filter(image => image.id !== imageId)};
  Object.assign(profile, saved);
  window.localStorage.setItem("vendor-account-profile", JSON.stringify(saved));
  refresh();
  return {status:"success",message:"Image removed."};
}

export async function saveVendorProfileImage(path:string):Promise<ActionState> {
  fixture.imageWrites++; refresh();
  if (fixture.imageFail) return {status:"error",message:"Profile image could not be saved. Refresh and try again."};
  const current = persistedProfile();
  const saved = {...current,profile_image_storage_path:path};
  Object.assign(profile, saved);
  window.localStorage.setItem("vendor-account-profile", JSON.stringify(saved));
  refresh();
  return {status:"success",message:"Profile image saved."};
}
export async function removeVendorProfileImage():Promise<ActionState> { return {status:"error",message:"Removal disabled in fixture"}; }
