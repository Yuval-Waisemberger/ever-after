import { PageTransition } from "@/components/layout/page-transition";
import { AppShell } from "@/components/layout/app-shell";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import TimelinePage from "@/app/(couple)/wedding/timeline/page";
import WeddingDashboardPage from "@/app/(couple)/wedding/page";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
function Fixture() {
  const [dashboard, setDashboard] = useState<ReactNode>(null);
  useEffect(() => { void (new URLSearchParams(location.search).has("timeline") ? TimelinePage() : WeddingDashboardPage({ params: Promise.resolve({}), searchParams: Promise.resolve(Object.fromEntries(new URLSearchParams(location.search))) })).then(setDashboard); }, []);
  return new URLSearchParams(location.search).has("shell") ? <AppShell role="couple" displayName="Alex & Sam">{new URLSearchParams(location.search).has("reference") ? <PageTransition>{dashboard}</PageTransition> : dashboard}</AppShell> : <>{dashboard}</>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
