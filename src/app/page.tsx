import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ClipboardCheck, Flower2, Heart, Sparkles, Sprout, Wallet } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { getCurrentProfile } from "@/lib/auth/user";
import { redirect } from "next/navigation";

const pillars = [
  { icon: ClipboardCheck, title: "Plan with ease", copy: "Tasks, timeline and wedding details in one place." },
  { icon: Heart, title: "Find the perfect vendors", copy: "Discover wedding vendors that fit your style, location and budget." },
  { icon: Wallet, title: "Stay on track", copy: "Track budget, payments and important deadlines." },
  { icon: Sparkles, title: "AI Wedding Assistant", copy: "Get personalized planning guidance based on your wedding context." },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profile.role === "couple" ? "/wedding" : "/vendor");
  return (
    <div className="public-theme landing-page">
      <PublicHeader />
      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-title">
          {/* Keep a future approved video swap confined to this media layer. */}
          <div className="hero-media" aria-hidden="true">
            <Image src="/images/landing/ever-after-hero-approved.png" alt="" fill sizes="100vw" priority className="hero-photo" />
          </div>
          <div className="hero-content">
            <h1 id="hero-title">EVER AFTER</h1>
            <div className="hero-ornament" aria-hidden="true"><span /><Flower2 size={24} strokeWidth={1} /><span /></div>
            <p className="hero-tagline">Everything before your ever after</p>
            <p className="hero-description">Plan your wedding, discover the right vendors,<br className="desktop-break" /> and keep every detail in one beautiful place.</p>
            <div className="hero-actions">
              <Link href="/auth/couple" className="public-button hero-primary">Plan our wedding</Link>
              <Link href="/vendors" className="public-button hero-secondary">Explore vendors</Link>
            </div>
            <p className="hero-vendor">Are you a vendor? <Link href="/auth/vendor">Join Ever After <span aria-hidden="true">→</span></Link></p>
          </div>
          <a href="#how-it-works" className="hero-scroll" aria-label="Discover how Ever After works"><ChevronDown size={30} strokeWidth={1} /></a>
        </section>
        <section id="how-it-works" className="landing-pillars" aria-labelledby="pillars-title">
          <Sprout className="section-flourish" size={31} strokeWidth={1} aria-hidden="true" />
          <p className="public-eyebrow">Your day, beautifully organized</p>
          <h2 id="pillars-title">All the tools you need, in one place.</h2>
          <div className="pillar-grid">
            {pillars.map(({ icon: Icon, title, copy }) => (
              <div className="pillar" key={title}>
                <Icon size={40} strokeWidth={1.15} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
