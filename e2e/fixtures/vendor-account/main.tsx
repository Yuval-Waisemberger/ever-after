import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "@/app/(vendor)/vendor/page";
import Profile from "@/app/(vendor)/vendor/profile/page";
import { AppShell } from "@/components/layout/app-shell";
import { fixture, refresh } from "./data";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/app/vendor-account.css";
function Fixture() {
  const [revision, render] = useState(0), [page, setPage] = useState<ReactNode>(null);
  useEffect(()=>{ const update=()=>render(n=>n+1); window.addEventListener("fixture-refresh",update); return()=>window.removeEventListener("fixture-refresh",update); },[]);
  useEffect(()=>{ let current=true; void (location.pathname === "/vendor/profile" ? Profile() : Dashboard()).then(node=>{if(current)setPage(node);}); return()=>{current=false;}; },[revision]);
  return <><div className="flex flex-wrap gap-3 p-2 text-xs" aria-label="Fixture controls"><span>Isolated fixture · writes: {fixture.writes}</span><button onClick={()=>{fixture.fail=!fixture.fail;refresh();}}>Toggle failure</button><button onClick={()=>{fixture.imageFail=!fixture.imageFail;refresh();}}>Toggle image failure</button><button onClick={()=>{fixture.hold=!fixture.hold;refresh();}}>Toggle pending</button><button onClick={()=>fixture.resolve?.()}>Resolve request</button><button onClick={()=>render(n=>n+1)}>Rerender</button></div><AppShell role="vendor" displayName="Willow Studio">{page}</AppShell></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
