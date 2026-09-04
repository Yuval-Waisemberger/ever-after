import Link from "next/link";
import Image from "next/image";
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
    <main className={`auth-page min-h-screen bg-canvas ${audience === "couple" ? "auth-page--couple" : ""}`}>
      <div className="auth-brand-bar">
        <Wordmark />
        <Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">
          Explore vendors
        </Link>
      </div>
      <div className="auth-layout">
        <div className="auth-introduction">
          <p className="eyebrow">{audience === "couple" ? "Everything before your happily ever after" : "Everything before your ever after"}</p>
          <h2 className="font-display auth-editorial-title">
            {audience === "couple" ? "Your Next Chapter Starts Here." : "Your Work. Their Perfect Day."}
          </h2>
          <p className="mt-5 leading-7 text-ink-soft">
            {audience === "couple" ? "A space for the two of you, bringing every part of your wedding together, beautifully." : "Manage your public profile, services, images, and reviews from one calm dashboard."}
          </p>
          <div className="auth-image">
            <Image
              src={audience === "couple" ? "/images/auth/couple-petals.webp" : "/demo-marketplace/event-managers/event-managers-01.webp"}
              alt={audience === "couple" ? "Newlyweds sharing a kiss beneath falling ivory petals" : "Wedding planner reviewing reception preparations"}
              fill
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 900px) 592px, 440px"
              className="object-cover"
            />
          </div>
        </div>
        <AuthPanel audience={audience} initialMode={mode} message={message} />
      </div>
    </main>
  );
}
