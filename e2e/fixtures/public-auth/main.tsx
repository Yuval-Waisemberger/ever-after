import { useEffect, useState, type ReactNode } from "react";
import VendorAuth from "@/app/auth/vendor/page";
import { AuthPage } from "@/components/auth/auth-page";
import HomePage from "@/app/page";
import VerificationPage from "@/app/auth/verification/page";
import { RecoveryPage } from "@/components/auth/recovery-page";
import { ForgotPasswordPanel, ResetPasswordPanel } from "@/components/auth/password-recovery-panel";
import { createRoot } from "react-dom/client";
import { AuthPanel } from "@/components/auth/auth-panel";
import { finishAction, finishPasswordResetRequest } from "./actions";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/app/public.css";
import "@/app/public-auth.css";

const existing = <main className="auth-page auth-page--couple">
  <div style={{ maxWidth: 540, padding: 20, margin: "auto" }}>
    <button type="button" onClick={finishAction}>Resolve fixture request</button>
    <AuthPanel audience="couple" initialMode="login" />
  </div>
</main>;
function Fixture() {
  const [page, setPage] = useState<ReactNode>(null);
  const [search, setSearch] = useState(location.search);
  useEffect(() => {
    const navigate = (event: Event) => { const next = (event as CustomEvent<string>).detail; history.pushState({}, "", next); setSearch(next); };
    window.addEventListener("visual-navigate", navigate);
    window.addEventListener("visual-finish", finishAction);
    window.addEventListener("visual-password-reset-success", finishPasswordResetRequest);
    return () => { window.removeEventListener("visual-navigate", navigate); window.removeEventListener("visual-finish", finishAction); window.removeEventListener("visual-password-reset-success", finishPasswordResetRequest); };
  }, []);
  const query = new URLSearchParams(search);
  const vendor = query.has("vendor"), verification = query.has("verification"), landing = query.has("landing");
  useEffect(() => {
    const searchParams = Promise.resolve(Object.fromEntries(new URLSearchParams(search)));
    if (vendor) void VendorAuth({ params: Promise.resolve({}), searchParams }).then(setPage);
    if (verification) void VerificationPage({ searchParams }).then(setPage);
    if (landing) void HomePage().then(setPage);
  }, [vendor, verification, landing, search]);
  if (verification) return page;
  if (query.has("landing")) return page;
  if (query.has("couple")) return <AuthPage audience="couple" mode={query.get("mode") === "signup" ? "signup" : "login"} />;
  if (query.has("forgot")) return <RecoveryPage><ForgotPasswordPanel /></RecoveryPage>;
  if (query.has("reset")) return <RecoveryPage><ResetPasswordPanel available /></RecoveryPage>;
  return vendor ? page : existing;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
