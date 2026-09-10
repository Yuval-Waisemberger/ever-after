import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import type { CurrentProfile } from "@/lib/auth/user";

vi.mock("@/components/layout/public-header", () => ({ PublicHeader: () => <header>How it works</header> }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ role, children }: {role: string; children: ReactNode}) => <div data-role={role}>{children}</div> }));
vi.mock("@/lib/queries/wedding", () => ({getOwnedWedding: vi.fn(async () => ({setup_status: "completed"}))}));
vi.mock("@/lib/queries/couple-identity", () => ({getCoupleIdentity: vi.fn(async () => ({avatarChoice: "heart", photoUrl: null}))}));

vi.mock("@/lib/queries/vendor-dashboard", () => ({getVendorIdentity: vi.fn(async () => ({displayName: "Canonical business", photoUrl: null}))}));

describe("Marketplace server shell selection", () => {
  it.each(["couple", "vendor"] as const)("renders only the %s shell before hydration", async role => {
    const profile: CurrentProfile = {id: "test", role, displayName: "Test", avatarChoice: "heart", avatarStoragePath: null};
    const html = renderToStaticMarkup(await MarketplaceShell({profile, children: <main>Marketplace</main>}));
    expect(html).toContain(`data-role="${role}"`);
    expect(html).not.toContain("How it works");
    expect(html).toContain("Marketplace");
  });
  it("keeps the public header for a guest without an application shell", async () => {
    const html = renderToStaticMarkup(await MarketplaceShell({profile: null, children: <main>Marketplace</main>}));
    expect(html).toContain("How it works");
    expect(html).not.toContain("data-role");
  });
});
