import Link from "next/link";
import Image from "next/image";
import { Wordmark } from "@/components/brand/wordmark";
import { AuthPanel } from "./auth-panel";
import { LandingNavigation } from "@/components/public/landing-navigation";
import "@/app/public-auth.css";
import "./vendor-auth.css";

export function AuthPage({
  audience,
  mode,
  message,
}: {
  audience: "couple" | "vendor";
  mode?: "login" | "signup";
  message?: string;
}) {
  const EditorialTitle = audience === "couple" ? "p" : "h2";
  const introduction = <>
    <p className="eyebrow">Everything before your ever after</p>
    <EditorialTitle className="font-display auth-editorial-title">
      {audience === "couple" ? "Your Next Chapter Starts Here." : "Your Work. Their Perfect Day."}
    </EditorialTitle>
    <p className="mt-5 leading-7 text-ink-soft">
      {audience === "couple" ? "A space for the two of you, bringing every part of your wedding together, beautifully." : "Manage your public profile, services, images, and reviews from one calm dashboard."}
    </p>
  </>;
  const photograph = <div className="auth-image">
    <Image
      src={audience === "couple" ? "/images/auth/hands-and-rings.webp" : "/images/auth/vendor-auth-planner.png"}
      alt={audience === "couple" ? "Wedding rings on two hands resting together on ivory fabric" : "Wedding planner reviewing reception preparations"}
      fill
      unoptimized={audience === "vendor"}
      sizes={audience === "couple" ? "(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 230px, 410px" : "(max-width: 640px) calc(100vw - 40px), (max-width: 900px) 592px, 440px"}
      className="object-cover"
      priority={audience === "couple"}
    />
    {audience === "couple" ? <p className="auth-photo-caption">A beautiful<br />tomorrow, together</p> : null}
  </div>;
  return (
    <main id="main-content" className={`auth-page min-h-screen bg-canvas ${audience === "couple" ? "auth-page--couple" : ""}`}>
      {audience === "couple" ? <LandingNavigation context="auth" /> : <div className="auth-brand-bar">
        <Wordmark />
        <Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">
          Explore vendors
        </Link>
      </div>}
      <div className="auth-layout">
        <div className="auth-introduction">
          {audience === "couple" ? <div className="auth-copy">{introduction}</div> : <div className="vendor-auth-copy">{introduction}</div>}
          {audience === "couple" ? <ol className="auth-editorial-list" aria-label="Planning with Ever After">
            <li>Plan with ease</li><li>Find the perfect vendors</li><li>Stay on track</li><li>A more meaningful journey together</li>
          </ol> : photograph}
        </div>
        {audience === "couple" ? photograph : null}
        <AuthPanel audience={audience} initialMode={mode} message={message} />
      </div>
    </main>
  );
}
