import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentProfile } from "@/lib/auth/user";

export async function PublicHeader() {
  const profile = await getCurrentProfile();
  return (
    <header className="border-b bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-12">
        <Wordmark />
        <nav className="flex items-center gap-2 text-sm" aria-label="Public navigation">
          <Link href="/vendors" className="hidden min-h-10 items-center rounded-full px-4 font-semibold text-ink-soft hover:bg-paper-muted hover:text-wine sm:inline-flex">Explore vendors</Link>
          {profile ? (
            <LinkButton href={profile.role === "couple" ? "/wedding" : "/vendor"}>Open workspace</LinkButton>
          ) : (
            <LinkButton href="/auth/couple?mode=login" tone="secondary">Sign in</LinkButton>
          )}
        </nav>
      </div>
    </header>
  );
}
