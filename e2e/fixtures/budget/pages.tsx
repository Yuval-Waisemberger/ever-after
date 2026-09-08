import { createRoot } from "react-dom/client";
import BudgetPage from "@/app/(couple)/budget/page";
import GuestsPage from "@/app/(couple)/guests/page";
import "@/app/globals.css";

// Render the actual server-page compositions with query/action aliases, never a database.
const view = new URLSearchParams(location.search).get("view");
const page = view === "guests" ? await GuestsPage({ searchParams: Promise.resolve({}) }) : await BudgetPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
createRoot(document.getElementById("root")!).render(<><p className="px-5 pt-4 text-xs text-ink-soft">Isolated visual fixture · synthetic data</p>{page}</>);
