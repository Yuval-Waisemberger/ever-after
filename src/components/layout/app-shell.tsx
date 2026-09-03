import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CircleUserRound,
  Heart,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  Store,
  WalletCards,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { signOut } from "@/lib/actions/auth";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Heart;
  children?: Array<{ label: string; href: string }>;
};

const coupleNavigation: NavigationItem[] = [
  {
    label: "My Wedding",
    href: "/wedding",
    icon: Heart,
    children: [
      { label: "Wedding Details", href: "/wedding/details" },
      { label: "Wedding Timeline", href: "/wedding/timeline" },
      { label: "Complete Wedding Setup", href: "/wedding/setup" },
    ],
  },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  {
    label: "Vendors",
    href: "/vendors",
    icon: Store,
    children: [
      { label: "Explore All", href: "/vendors" },
      { label: "Venues", href: "/vendors?category=venues" },
      { label: "Photography & Content", href: "/vendors?category=photography-content" },
      { label: "Music & Entertainment", href: "/vendors?category=music-entertainment" },
      { label: "Beauty & Attire", href: "/vendors?category=beauty-attire" },
      { label: "Design & Flowers", href: "/vendors?category=design-flowers" },
      { label: "Event Services", href: "/vendors?category=event-services" },
      { label: "My Vendors", href: "/vendors/my" },
    ],
  },
  { label: "Budget", href: "/budget", icon: WalletCards },
  { label: "Wedding Assistant", href: "/assistant", icon: Bot },
  { label: "Account & Settings", href: "/settings", icon: Settings },
];

const vendorNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
  { label: "My Business Profile", href: "/vendor/profile", icon: BriefcaseBusiness },
  { label: "Explore Vendors", href: "/vendor/explore", icon: Search },
  { label: "Settings", href: "/vendor/settings", icon: Settings },
];

export function AppShell({
  role,
  displayName,
  children,
}: {
  role: "couple" | "vendor";
  displayName: string;
  children: ReactNode;
}) {
  const navigation = role === "couple" ? coupleNavigation : vendorNavigation;
  const mobileNavigation = navigation.slice(0, 5);

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r bg-paper px-5 py-6 lg:flex lg:flex-col">
        <Wordmark href={role === "couple" ? "/wedding" : "/vendor"} />
        <nav className="mt-10 flex-1 space-y-2" aria-label={`${role} navigation`}>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-paper-muted hover:text-wine"
                >
                  <Icon className="size-4.5 text-wine" aria-hidden="true" />
                  {item.label}
                </Link>
                {item.children ? (
                  <div className="ml-9 border-l pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-lg px-2 py-1.5 text-xs leading-5 text-ink-soft transition hover:bg-paper-muted hover:text-wine"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="mt-6 border-t pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-wine/10 text-wine">
              {role === "couple" ? <CircleUserRound className="size-4" /> : <Building2 className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs capitalize text-ink-soft">{role} account</p>
            </div>
          </div>
          <form action={signOut} className="mt-3">
            <button className="min-h-9 w-full rounded-lg text-left text-xs font-semibold text-ink-soft hover:text-wine">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b bg-paper/90 px-5 py-4 backdrop-blur lg:hidden">
          <Wordmark href={role === "couple" ? "/wedding" : "/vendor"} />
          <span className="max-w-32 truncate text-xs font-semibold text-ink-soft">{displayName}</span>
        </header>
        <div className="min-h-screen pb-24 lg:pb-0">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-paper/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[0.65rem] font-semibold text-ink-soft hover:bg-paper-muted hover:text-wine">
              <Icon className="size-4.5" aria-hidden="true" />
              <span className="line-clamp-1">{item.label.replace("Wedding Assistant", "Assistant")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
