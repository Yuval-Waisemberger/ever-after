import { Wordmark } from "@/components/brand/wordmark";
import { LinkButton } from "@/components/ui/link-button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-canvas px-6 py-8 text-center">
      <Wordmark />
      <div className="my-auto max-w-lg py-20">
        <p className="eyebrow">404 · Page not found</p>
        <h1 className="font-display mt-5 text-4xl leading-tight tracking-tight sm:text-5xl">A little off the path.</h1>
        <p className="mt-5 leading-7 text-ink-soft">This page isn’t here. Return home or continue exploring the people who can bring your day together.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/">Back to home</LinkButton>
          <LinkButton href="/vendors" tone="secondary">Explore vendors</LinkButton>
        </div>
      </div>
    </main>
  );
}
