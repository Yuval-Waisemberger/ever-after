import { expect, it, vi } from "vitest";
const { select, eq } = vi.hoisted(() => ({select:vi.fn(),eq:vi.fn()}));
vi.mock("@/lib/queries/wedding",()=>({getOwnedWedding:async()=>({id:"owned"})}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({from:()=>{
 const chain={select:(value:string)=>{select(value);return chain;},eq:(...args:unknown[])=>{eq(...args);return chain;},order:()=>chain,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[{id:"task",assignee:"partner_two"}],error:null}).then(resolve)};
 return chain;
}})}));
import { getTasks } from "@/lib/queries/tasks";
it("selects and returns the stored assignment within the owned wedding",async()=>{
 expect(await getTasks()).toEqual([{id:"task",assignee:"partner_two"}]);
 expect(select.mock.calls[0][0].split(", ")).toContain("assignee");
 expect(eq).toHaveBeenCalledWith("wedding_id","owned");
});
