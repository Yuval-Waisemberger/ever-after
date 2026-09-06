"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Heart,
  LayoutDashboard,
  ListChecks,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Star,
  Store,
  WalletCards,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { CoupleAvatar } from "@/components/couple/couple-avatar";
import { signOut } from "@/lib/actions/auth";
import type { CoupleAvatarChoice } from "@/lib/domain/couple-identity";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Heart;
  children?: Array<{ label: string; href: string }>;
};

const coupleNavigation: NavigationItem[] = [
  {
    label: "Our Wedding",
    href: "/wedding",
    icon: Heart,
    children: [
      { label: "Wedding Details", href: "/wedding/details" },
      { label: "Wedding Timeline", href: "/wedding/timeline" },
      { label: "Complete Wedding Setup", href: "/wedding/setup" },
    ],
  },
  { label: "Our Tasks", href: "/tasks", icon: ListChecks },
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
      { label: "Cakes & Desserts", href: "/vendors?category=cakes-desserts" },
      { label: "Wedding Accessories & Party Extras", href: "/vendors?category=wedding-accessories-party-extras" },
      { label: "Our Vendors", href: "/vendors/my" },
    ],
  },
  { label: "Budget", href: "/budget", icon: WalletCards },
  { label: "Wedding Assistant", href: "/assistant", icon: Bot },
  { label: "My Reviews", href: "/reviews", icon: Star },
  { label: "Account & Settings", href: "/settings", icon: Settings },
];

const vendorNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
  { label: "My Business Profile", href: "/vendor/profile", icon: BriefcaseBusiness },
  { label: "Explore Vendors", href: "/vendor/explore", icon: Search },
  { label: "Settings", href: "/vendor/settings", icon: Settings },
];

export function AppShell({ role, displayName, showSetup = false, avatarChoice, avatarPhotoUrl, children }: {
  role: "couple" | "vendor";
  displayName: string;
  showSetup?: boolean;
  avatarChoice?: CoupleAvatarChoice;
  avatarPhotoUrl?: string | null;
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navigation = (role === "couple" ? coupleNavigation : vendorNavigation).map((item) => ({
    ...item,
    children: item.children?.filter((child) => child.href !== "/wedding/setup" || showSetup),
  }));
  const mobileNavigation = navigation.slice(0, 5);

  return (
    <div className={`workspace-shell min-h-screen bg-canvas lg:grid ${sidebarCollapsed ? "workspace-shell--collapsed" : ""}`}>
      <aside className="workspace-sidebar sticky top-0 hidden h-screen border-r bg-paper px-5 py-6 lg:flex lg:flex-col">
        <div className="workspace-sidebar-brand flex items-center justify-between gap-2">
          {sidebarCollapsed ? (
            <Link href={role === "couple" ? "/wedding" : "/vendor"} className="grid size-10 place-items-center text-wine" aria-label="Ever After home"><Heart className="size-5" /></Link>
          ) : <Wordmark href={role === "couple" ? "/wedding" : "/vendor"} />}
          <button type="button" className="grid size-10 place-items-center text-ink-soft hover:text-wine" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? "Expand side navigation" : "Collapse side navigation"}>
            {sidebarCollapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </button>
        </div>

        <nav className="mt-10 flex-1 space-y-2" aria-label={`${role} navigation`}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const expanded = Boolean(openGroups[item.href]);
            return (
              <div key={item.href} className="workspace-nav-group">
                <div className="flex items-center">
                  <Link href={item.href} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-paper-muted hover:text-wine" aria-label={sidebarCollapsed ? item.label : undefined}>
                    <Icon className="size-4.5 shrink-0 text-wine" aria-hidden="true" />
                    {!sidebarCollapsed ? <span>{item.label}</span> : null}
                  </Link>
                  {item.children?.length && !sidebarCollapsed ? (
                    <button type="button" className="workspace-subnav-toggle grid size-10 shrink-0 place-items-center text-ink-soft hover:text-wine" onClick={() => setOpenGroups((groups) => ({ ...groups, [item.href]: !expanded }))} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label} links`}>
                      <ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  ) : null}
                </div>
                {item.children?.length && expanded && !sidebarCollapsed ? (
                  <div className="ml-9 border-l pl-3">
                    {item.children.map((child) => <Link key={child.href} href={child.href} className="block rounded-lg px-2 py-1.5 text-xs leading-5 text-ink-soft transition hover:bg-paper-muted hover:text-wine">{child.label}</Link>)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-6 border-t pt-5">
          <div className="flex items-center gap-3">
            {role === "couple" ? <CoupleAvatar choice={avatarChoice ?? "heart"} photoUrl={avatarPhotoUrl} className="size-10" sizes="40px" /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wine/10 text-wine"><Building2 className="size-4" /></span>}
            {!sidebarCollapsed ? <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{displayName}</p><p className="text-xs capitalize text-ink-soft">{role} account</p></div> : null}
          </div>
          <form action={signOut} className="mt-3"><button className="min-h-9 w-full rounded-lg text-left text-xs font-semibold text-ink-soft hover:text-wine" aria-label={sidebarCollapsed ? "Sign out" : undefined}>{sidebarCollapsed ? "↪" : "Sign out"}</button></form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="workspace-mobile-header flex items-center justify-between gap-3 border-b px-5 py-3 lg:hidden">
          <Wordmark href={role === "couple" ? "/wedding" : "/vendor"} />
          <details className="workspace-menu">
            <summary aria-label="Workspace menu"><Menu size={22} strokeWidth={1.4} /></summary>
            <div>
              <div className="mb-4 flex items-center gap-3 border-b pb-4">{role === "couple" ? <CoupleAvatar choice={avatarChoice ?? "heart"} photoUrl={avatarPhotoUrl} className="size-10" sizes="40px" /> : null}<p className="text-sm text-ink-soft">{displayName}</p></div>
              <nav aria-label={`${role} full mobile navigation`}>
                {navigation.map((item) => <div key={item.href} className="workspace-mobile-nav-item"><a href={item.href}>{item.label}</a>{item.children?.length ? <details className="workspace-mobile-subnav"><summary aria-label={`Show ${item.label} links`}><ChevronDown className="size-4" /></summary><div>{item.children.map((child) => <a key={child.href} href={child.href}>{child.label}</a>)}</div></details> : null}</div>)}
              </nav>
              <form action={signOut} className="mt-4 border-t pt-4"><button className="text-sm text-wine">Sign out</button></form>
            </div>
          </details>
        </header>
        <div className="min-h-screen pb-24 lg:pb-0">{children}</div>
      </div>

      <nav className={`workspace-bottom-nav fixed inset-x-0 bottom-0 z-40 grid ${role === "couple" ? "grid-cols-5" : "grid-cols-4"} border-t px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden`} aria-label="Mobile navigation">
        {mobileNavigation.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[0.65rem] font-semibold text-ink-soft hover:bg-paper-muted hover:text-wine"><Icon className="size-4.5" aria-hidden="true" /><span className="line-clamp-1">{item.label.replace("Wedding Assistant", "Assistant")}</span></Link>; })}
      </nav>
    </div>
  );
}
