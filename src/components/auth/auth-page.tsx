import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { AuthPanel } from "./auth-panel";

export function AuthPage({
  audience,
  mode,
  message,
}: {
  audience: "couple" | "vendor";
  mode?: "login" | "signup";
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-canvas px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Wordmark />
        <Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">
          Explore vendors
        </Link>
      </div>
      <div className="mx-auto grid max-w-6xl items-start gap-10 py-12 lg:grid-cols-[0.75fr_1.25fr] lg:py-20">
        <div className="max-w-md pt-5">
          <p className="eyebrow">One thoughtful beginning</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.02] tracking-tight">
            {audience === "couple" ? "Keep the beautiful parts. Organize the rest." : "Let the right couples find your work."}
          </h2>
          <p className="mt-5 leading-7 text-ink-soft">
            {audience === "couple" ? "Setup is optional, every detail stays editable, and your workspace grows with your plans." : "Manage your public profile, services, images, and reviews from one calm dashboard."}
          </p>
        </div>
        <AuthPanel audience={audience} initialMode={mode} message={message} />
      </div>
    </main>
  );
}
