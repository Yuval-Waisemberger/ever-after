import Link from "next/link";
import { LandingNavigation } from "@/components/public/landing-navigation";
import { LandingHero } from "@/components/public/landing-hero";
import { LandingFeatures } from "@/components/public/landing-features";
import { getCurrentProfile } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import "./public-auth.css";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profile.role === "couple" ? "/wedding" : "/vendor");
  return (
    <div className="public-theme landing-page">
      <LandingNavigation />
      <main id="main-content" className="ea-page-transition">
        <LandingHero />
        <LandingFeatures />
        <section id="about-us" className="landing-about" aria-labelledby="about-title">
          <p className="public-eyebrow">Made for the two of you</p>
          <h2 id="about-title">Less scattered. More together.</h2>
          <p>Ever After brings your plans, people and possibilities into one shared space, so you can make room for the moments that matter.</p>
          <Link href="/auth/couple" className="ea-text-action">Start your next chapter <span aria-hidden="true">→</span></Link>
        </section>
      </main>
    </div>
  );
}
