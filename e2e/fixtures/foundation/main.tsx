import { Suspense, use, useState } from "react";
import { createRoot } from "react-dom/client";
import { PageTransition } from "@/components/layout/page-transition";
import { PageLoading } from "@/components/ui/page-loading";
import { FormField } from "@/components/ui/form-field";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { StatusPill } from "@/components/ui/status-pill";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/app/public.css";

let finishLoading: () => void;
const contentReady = new Promise<void>((resolve) => { finishLoading = resolve; });

function ReadyContent() {
  use(contentReady);
  return <main className="ea-page-loading"><h2 className="ea-heading-section">Ready content</h2></main>;
}

function Fixture() {
  const [revision, setRevision] = useState(0);
  return <div className="max-w-4xl mx-auto p-5">
    <button className="ea-button ea-button--secondary" onClick={() => setRevision(r => r + 1)}>Render again</button>
    <span className="ea-caption ml-3">Render {revision}</span>
    <PageTransition><main>
      <h1 className="ea-heading-display my-6">Shared foundation</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {["standard", "blush", "tonal", "champagne"].map(tone => <section key={tone} className={`ea-surface ea-surface--${tone} p-5`}><h2 className="ea-heading-section">{tone}</h2><p className="ea-body">Warm surfaces, quiet depth.</p></section>)}
      </div>
      <section className="ea-surface p-5 my-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <button className="ea-button ea-button--primary">Primary</button>
          <button className="ea-button ea-button--secondary">Secondary</button>
          <button className="ea-button ea-button--danger">Destructive</button>
          <button className="ea-button ea-button--primary" disabled>Disabled</button>
          <a className="public-button hero-primary" href="#fields">Public primary</a>
        </div>
        <form id="fields" onSubmit={event => event.preventDefault()} className="grid gap-5">
          <FormField label="Name" name="name" />
          <FormField label="Password" name="password" type="password" />
          <ChoiceGrid name="styles" choices={["Elegant", "Romantic"]} />
          <label className="flex items-center gap-3 min-h-11"><input className="ea-toggle" type="checkbox" role="switch" />Notifications</label>
          <div className="flex flex-wrap gap-2"><StatusPill tone="waiting">Waiting on vendor</StatusPill><StatusPill tone="danger">Overdue 3 days</StatusPill><StatusPill tone="success">Completed</StatusPill></div>
          <p role="status" className="ea-feedback ea-feedback--success">Changes saved</p>
          <p role="alert" className="ea-feedback ea-feedback--error">Please check this field</p>
        </form>
      </section>
    </main></PageTransition>
    <button className="ea-button ea-button--secondary" onClick={() => finishLoading()}>Resolve fixture loading</button>
    <PageTransition><Suspense fallback={<PageLoading />}><ReadyContent /></Suspense></PageTransition>
  </div>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
