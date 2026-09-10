// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({jar:new Map<string,string>(),login:vi.fn(),logout:vi.fn(),lookup:vi.fn(),eq:vi.fn(),claims:vi.fn(),redirect:vi.fn()}));
vi.mock("react",async importOriginal=>({...await importOriginal<typeof import("react")>(),cache:<T,>(fn:T)=>fn}));
vi.mock("next/headers",()=>({cookies:async()=>({getAll:()=>[...m.jar].map(([name,value])=>({name,value})),delete:(name:string)=>m.jar.delete(name)})}));
vi.mock("next/navigation",()=>({redirect:(path:string)=>{m.redirect(path);throw new Error(`REDIRECT:${path}`);}}));
vi.mock("@/lib/supabase/config",()=>({isSupabaseConfigured:()=>true,getSupabaseConfig:()=>({url:"https://fixture.supabase.co",publishableKey:"fixture"})}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getClaims:m.claims,signInWithPassword:m.login,signOut:m.logout},from:(table:string)=>{expect(table).toBe("profiles");return{select:()=>({eq:m.eq})};}})}));
import { signInCouple,signInVendor,signOut } from "@/lib/actions/auth";
import { requireRole } from "@/lib/auth/user";
const idle={status:"idle" as const};
const form=()=>{const f=new FormData();f.set("email","fixture@example.test");f.set("password","fixture-password");f.set("role","vendor");return f;};
const record=(role:string)=>({id:"owned",role,display_name:"Fixture",avatar_choice:"heart",avatar_storage_path:null});
beforeEach(()=>{
 vi.clearAllMocks();m.jar.clear();m.jar.set("unrelated-cookie","keep");
 m.claims.mockImplementation(async()=>({data:{claims:m.jar.has("sb-fixture-auth-token.0")?{sub:"owned"}:null},error:null}));
 m.eq.mockImplementation((field,id)=>{expect(field).toBe("id");expect(id).toBe("owned");return{maybeSingle:m.lookup};});
 m.lookup.mockResolvedValue({data:record("couple"),error:null});
 m.login.mockImplementation(async()=>{m.jar.set("sb-fixture-auth-token.0","session");m.jar.set("sb-fixture-auth-token.1","chunk");return{data:{user:{id:"owned"}},error:null};});
 m.logout.mockResolvedValue({error:null});
});
describe("dedicated password portals using the canonical profile resolver",()=>{
 for(const [role,action,target,other] of [["couple",signInCouple,"/wedding","vendor"],["vendor",signInVendor,"/vendor","couple"]] as const){
  it(`${role}: correct role redirects only after lookup`,async()=>{
   m.lookup.mockResolvedValue({data:record(role),error:null});
   await expect(action(idle,form())).rejects.toThrow(`REDIRECT:${target}`);
   expect(m.logout).not.toHaveBeenCalled();expect(m.lookup.mock.invocationCallOrder[0]).toBeLessThan(m.redirect.mock.invocationCallOrder[0]);
  });
  it(`${role}: wrong role expires all session chunks before error; direct navigation stays blocked`,async()=>{
   m.lookup.mockResolvedValue({data:record(other),error:null});
   expect(await action(idle,form())).toMatchObject({status:"error",message:expect.stringContaining(`Please use ${other==="vendor"?"Vendor":"Couple"} sign in.`)});
   expect(m.logout).toHaveBeenCalledWith({scope:"local"});expect(m.redirect).not.toHaveBeenCalled();
   expect([...m.jar.keys()]).toEqual(["unrelated-cookie"]);
   for(const area of ["couple","vendor"] as const) await expect(requireRole(area)).rejects.toThrow(`REDIRECT:/auth/${area}`);
  });
  it(`${role}: invalid credentials retain the generic error`,async()=>{
   m.login.mockResolvedValue({data:{user:null},error:{message:"provider detail"}});
   expect(await action(idle,form())).toEqual({status:"error",message:"Email or password is incorrect."});
   expect(m.lookup).not.toHaveBeenCalled();expect(m.logout).not.toHaveBeenCalled();
  });
  for(const state of ["missing","invalid","error","throw"]){
   it(`${role}: ${state} role fails closed`,async()=>{
    if(state==="throw")m.lookup.mockRejectedValue(new Error("private detail"));
    else m.lookup.mockResolvedValue({data:state==="missing"?null:record(state==="invalid"?"admin":role),error:state==="error"?{message:"private detail"}:null});
    expect(await action(idle,form())).toEqual({status:"error",message:"We could not verify your account type. Please try again."});
    expect(m.logout).toHaveBeenCalledWith({scope:"local"});expect([...m.jar.keys()]).toEqual(["unrelated-cookie"]);expect(m.redirect).not.toHaveBeenCalled();
   });
  }
 }
 it.each(["returned","thrown"])("expires cookies even with %s sign-out failure",async kind=>{
  m.lookup.mockResolvedValue({data:record("vendor"),error:null});
  if(kind==="thrown")m.logout.mockRejectedValue(new Error("network"));else m.logout.mockResolvedValue({error:{message:"network"}});
  expect((await signInCouple(idle,form())).status).toBe("error");expect([...m.jar.keys()]).toEqual(["unrelated-cookie"]);
 });
 it("preserves a pre-existing user instead of replacing or signing them out",async()=>{
  m.jar.set("sb-fixture-auth-token.0","existing");
  await expect(signInVendor(idle,form())).rejects.toThrow("REDIRECT:/wedding");
  expect(m.login).not.toHaveBeenCalled();expect(m.logout).not.toHaveBeenCalled();expect(m.jar.get("sb-fixture-auth-token.0")).toBe("existing");
 });
 it.each(["couple","vendor"] as const)("direct %s cross-role access redirects to the owned area",async role=>{
  m.jar.set("sb-fixture-auth-token.0","existing");m.lookup.mockResolvedValue({data:record(role),error:null});
  await expect(requireRole(role==="couple"?"vendor":"couple")).rejects.toThrow(`REDIRECT:${role==="couple"?"/wedding":"/vendor"}`);
 });
 it("does not replace a session whose claims cannot be verified",async()=>{m.claims.mockResolvedValue({data:null,error:{message:"network"}});expect((await signInCouple(idle,form())).status).toBe("error");expect(m.login).not.toHaveBeenCalled();expect(m.logout).not.toHaveBeenCalled();});
 it("existing logout behavior remains unchanged",async()=>{await expect(signOut()).rejects.toThrow("REDIRECT:/");expect(m.logout).toHaveBeenCalledWith();});
});
