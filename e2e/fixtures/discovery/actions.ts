import {fixture,refresh} from "./data";
import type {ActionState} from "@/lib/actions/state";
async function write(){ if(fixture.hold) await new Promise<void>(resolve=>{fixture.pending=resolve;}); fixture.pending=null; return !fixture.fail; }
export async function setVendorStatus(data:FormData){if(await write()){fixture.writes++;fixture.status=String(data.get("status"));refresh();}}
export async function setMarketplaceVendorSaved(data:FormData){if(await write()){fixture.writes++;fixture.saved=data.get("isSaved")==="true";refresh();}}
export const setRelationshipSaved=setMarketplaceVendorSaved;
export async function saveExternalVendor(_state:ActionState,data:FormData):Promise<ActionState>{if(!await write())return {status:"error",message:"The external vendor could not be confirmed. Refresh Our Vendors before trying again."};fixture.writes++;void data;return {status:"success",message:"External vendor added to Our Vendors."};}
export async function deleteExternalVendor(){}
export async function submitReview():Promise<ActionState>{return {status:"error",message:"Review writes are disabled in this visual fixture."};}
