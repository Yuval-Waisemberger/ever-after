import Image from "next/image";
import Link from "next/link";
import { PublicMobileMenu } from "./public-mobile-menu";
import { getCurrentProfile } from "@/lib/auth/user";

export async function PublicHeader() {
  const profile = await getCurrentProfile();
  const workspaceHref = profile ? (profile.role === "couple" ? "/wedding" : "/vendor") : undefined;
  return (
    <header className="public-theme public-header">
      <a className="public-skip-link" href="#main-content">Skip to content</a>
      <div className="public-header-inner">
        <Link href="/" className="public-brand" aria-label="Ever After home">
          <Image src="/brand/ever-after-approved.png" alt="Ever After" width={1536} height={1024} sizes="280px" priority />
        </Link>
        <nav className="public-desktop-nav" aria-label="Public navigation">
          <div className="public-nav-pages"><Link href="/#how-it-works">How it works</Link><Link href="/vendors">Vendors</Link></div>
          <div className="public-nav-account">
            {workspaceHref ? <Link className="public-button header-signup" href={workspaceHref}>Open workspace</Link> : <>
              <Link href="/auth/couple?mode=login">Log in</Link>
              <Link href="/auth/couple" className="public-button header-signup">Sign up</Link>
            </>}
          </div>
        </nav>
        <PublicMobileMenu workspaceHref={workspaceHref} />
      </div>
    </header>
  );
}
