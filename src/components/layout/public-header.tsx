import Image from "next/image";
import Link from "next/link";
import { PublicMobileMenu } from "./public-mobile-menu";
import { getPublicHeaderLinks } from "./public-header-links";
import { getCurrentProfile } from "@/lib/auth/user";

export async function PublicHeader() {
  const profile = await getCurrentProfile();
  const { navigationLinks, accountLinks } = getPublicHeaderLinks(profile?.role);
  return (
    <header className={`public-theme public-header ${profile ? "public-header--authenticated" : ""}`}>
      <a className="public-skip-link" href="#main-content">Skip to content</a>
      <div className="public-header-inner">
        <Link href="/" className="public-brand" aria-label="Ever After home">
          <Image src="/brand/ever-after-approved.png" alt="Ever After" width={1536} height={1024} sizes="280px" priority />
        </Link>
        <nav className="public-desktop-nav" aria-label="Public navigation">
          <div className="public-nav-pages">{navigationLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
          <div className="public-nav-account">
            {profile ? accountLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>) : <>
              <Link href="/auth/couple?mode=login">Log in</Link>
              <Link href="/auth/couple" className="public-button header-signup">Sign up</Link>
            </>}
          </div>
        </nav>
        <PublicMobileMenu links={[...navigationLinks, ...accountLinks]} authenticated={Boolean(profile)} />
      </div>
    </header>
  );
}
