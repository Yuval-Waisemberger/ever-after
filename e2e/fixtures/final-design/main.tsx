import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import Reviews from "@/app/(couple)/reviews/page";
import Settings from "@/app/(couple)/settings/page";
import VendorSettings from "@/app/(vendor)/vendor/settings/page";
import Guests from "@/app/(couple)/guests/page";
import Budget from "@/app/(couple)/budget/page";
import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";
import "@/app/product.css";
function Fixture() {
  const [revision, update] = useState(0), [page, setPage] = useState<ReactNode>(null);
  useEffect(() => { const refresh = () => update(n => n + 1); window.addEventListener("fixture-refresh", refresh); return () => window.removeEventListener("fixture-refresh", refresh); }, []);
  useEffect(() => {
    const searchParams = Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)));
    const params = Promise.resolve({});
    const content = location.pathname === "/guests" ? Guests({ searchParams }) : location.pathname === "/budget" ? Budget({ params, searchParams }) : location.pathname === "/settings" ? Settings() : location.pathname === "/vendor/settings" ? VendorSettings() : Reviews();
    void Promise.resolve(content).then(setPage);
  }, [revision]);
  return <AppShell role={location.pathname.startsWith("/vendor/") ? "vendor" : "couple"} displayName="Alex & Sam">{page}</AppShell>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
