import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentProfile } from "@/lib/auth/user";
import { redirect } from "next/navigation";

const promises = [
  "Organize your wedding in one place",
  "Discover vendors that fit your style",
  "Track tasks, budget, and payments",
  "Ask your personal Wedding Assistant",
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profile.role === "couple" ? "/wedding" : "/vendor");
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Wordmark />
        <LinkButton href="/auth/couple?mode=login" tone="quiet">
          Sign in
        </LinkButton>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-90px)] w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:pb-24">
        <div className="gentle-reveal max-w-2xl">
          <p className="eyebrow mb-5">A calmer way to plan</p>
          <h1 className="font-display text-[clamp(3.25rem,8vw,6.9rem)] leading-[0.9] tracking-[-0.045em] text-ink">
            Your wedding.
            <span className="mt-1 block italic text-wine">One place.</span>
            <span className="mt-1 block">Less chaos.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink-soft sm:text-xl">
            One connected workspace for the details, decisions, and people that make your day yours.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/auth/couple">
              Plan our wedding
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton href="/auth/vendor" tone="secondary">
              I&apos;m a vendor
            </LinkButton>
            <LinkButton href="/vendors" tone="quiet">
              Explore as guest
            </LinkButton>
          </div>
        </div>

        <div className="relative lg:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute -inset-8 rounded-[48%] border border-gold/35"
          />
          <div className="paper-panel relative max-w-lg overflow-hidden p-7 sm:p-10">
            <div className="mb-8 flex items-start justify-between border-b border-line pb-6">
              <div>
                <p className="eyebrow">Your shared space</p>
                <p className="font-display mt-2 text-3xl">Made for two</p>
              </div>
              <span className="grid size-11 place-items-center rounded-full bg-wine/8 text-wine">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
            </div>
            <ul className="space-y-5" aria-label="Platform highlights">
              {promises.map((promise) => (
                <li key={promise} className="flex items-center gap-4 text-[0.98rem] text-ink">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-sage/40 bg-sage/10 text-sage">
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {promise}
                </li>
              ))}
            </ul>
            <div className="mt-9 border-t border-line pt-6 text-sm leading-6 text-ink-soft">
              Start with what you know. Fill in the rest whenever you&apos;re ready.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
