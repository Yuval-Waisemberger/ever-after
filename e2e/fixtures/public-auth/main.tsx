import { createRoot } from "react-dom/client";
import { AuthPanel } from "@/components/auth/auth-panel";
import { finishAction } from "./actions";
import "@/app/globals.css";
import "@/app/product.css";
import "@/app/public-auth.css";

createRoot(document.getElementById("root")!).render(<main className="auth-page auth-page--couple">
  <div style={{ maxWidth: 540, padding: 20, margin: "auto" }}>
    <button type="button" onClick={finishAction}>Resolve fixture request</button>
    <AuthPanel audience="couple" initialMode="login" />
  </div>
</main>);
