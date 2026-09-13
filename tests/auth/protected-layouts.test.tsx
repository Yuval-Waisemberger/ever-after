import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  wedding: vi.fn(),
  coupleIdentity: vi.fn(),
  vendorIdentity: vi.fn(),
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ role, children }: { role: string; children: ReactNode }) => (
    <div data-role={role}>{children}</div>
  ),
}));
vi.mock("@/lib/auth/user", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.wedding }));
vi.mock("@/lib/queries/couple-identity", () => ({ getCoupleIdentity: mocks.coupleIdentity }));
vi.mock("@/lib/queries/vendor-dashboard", () => ({ getVendorIdentity: mocks.vendorIdentity }));

import CoupleLayout from "@/app/(couple)/layout";
import VendorLayout from "@/app/(vendor)/layout";
import { ProtectedAccessError } from "@/lib/auth/protected-access";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockImplementation(async (role: "couple" | "vendor") => ({
    id: `${role}-id`,
    role,
    displayName: `${role} account`,
    avatarChoice: "heart",
    avatarStoragePath: null,
  }));
  mocks.wedding.mockResolvedValue({ setup_status: "completed" });
  mocks.coupleIdentity.mockResolvedValue({ avatarChoice: "heart", photoUrl: null });
  mocks.vendorIdentity.mockResolvedValue({ displayName: "Vendor Studio", photoUrl: null });
});

describe("protected layout access failures", () => {
  it("renders authorized Couple and Vendor content normally", async () => {
    const couple = renderToStaticMarkup(await CoupleLayout({ children: <p>Couple private</p> }));
    const vendor = renderToStaticMarkup(await VendorLayout({ children: <p>Vendor private</p> }));
    expect(couple).toContain('data-role="couple"');
    expect(couple).toContain("Couple private");
    expect(vendor).toContain('data-role="vendor"');
    expect(vendor).toContain("Vendor private");
  });

  it.each([
    ["Guest", "REDIRECT:/auth/couple?message=Please sign in to continue"],
    ["wrong role", "REDIRECT:/vendor"],
  ])("does not swallow the existing %s redirect", async (_state, message) => {
    mocks.role.mockRejectedValue(new Error(message));
    await expect(CoupleLayout({ children: <p>Private</p> })).rejects.toThrow(message);
  });

  it.each([
    "auth_unavailable",
    "profile_unavailable",
    "profile_integrity",
  ] as const)("fails Couple layout closed for %s without rendering private content or Login", async code => {
    mocks.role.mockRejectedValue(new ProtectedAccessError(code));
    const html = renderToStaticMarkup(await CoupleLayout({ children: <p>Couple private secret</p> }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("could not verify");
    expect(html).not.toContain("Couple private secret");
    expect(html).not.toContain("Please sign in");
    expect(mocks.wedding).not.toHaveBeenCalled();
  });

  it("fails Couple layout closed when owned-wedding resolution is unavailable", async () => {
    mocks.wedding.mockRejectedValue(new ProtectedAccessError("owned_wedding_unavailable"));
    const html = renderToStaticMarkup(await CoupleLayout({ children: <p>Couple private secret</p> }));
    expect(html).toContain("could not verify access right now");
    expect(html).not.toContain("Couple private secret");
  });

  it("fails Vendor layout closed for a temporary profile failure", async () => {
    mocks.role.mockRejectedValue(new ProtectedAccessError("profile_unavailable"));
    const html = renderToStaticMarkup(await VendorLayout({ children: <p>Vendor private secret</p> }));
    expect(html).toContain("could not verify access right now");
    expect(html).not.toContain("Vendor private secret");
    expect(mocks.vendorIdentity).not.toHaveBeenCalled();
  });
});
