// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  wedding: vi.fn(),
  identity: vi.fn(),
  refresh: vi.fn(),
  calls: [] as Array<[string, ...unknown[]]>,
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/auth/user", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.wedding }));
vi.mock("@/lib/queries/couple-identity", () => ({ getCoupleIdentity: mocks.identity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      mocks.calls.push(["from", table]);
      const chain: Record<string, unknown> = {};
      for (const operation of ["insert", "select", "single"]) {
        chain[operation] = (...args: unknown[]) => {
          mocks.calls.push([operation, ...args]);
          return chain;
        };
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: { id: "task-id" }, error: null }).then(resolve);
      return chain;
    },
  }),
}));

import CoupleLayout from "@/app/(couple)/layout";
import { saveTask } from "@/lib/actions/tasks";
import { ProtectedAccessError } from "@/lib/auth/protected-access";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.wedding.mockResolvedValue({ id: "owned-wedding", setup_status: "completed" });
  mocks.role.mockResolvedValue({ id: "couple-id", role: "couple", displayName: "Couple" });
  mocks.identity.mockResolvedValue({ avatarChoice: "heart", photoUrl: null });
});

it("does not retry or show Login when a post-write protected render temporarily loses Auth availability", async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "Keep this draft",
    notes: "Still present",
    category: "Other",
    dueDate: "2026-09-30",
    priority: "medium",
    status: "open",
  })) form.set(key, value);

  await expect(saveTask({ status: "idle" }, form)).resolves.toMatchObject({ status: "success" });
  expect(mocks.calls.filter(([operation]) => operation === "insert")).toHaveLength(1);

  mocks.role.mockRejectedValue(new ProtectedAccessError("auth_unavailable"));
  const html = renderToStaticMarkup(await CoupleLayout({ children: <p>Private Couple content</p> }));

  expect(html).toContain("could not verify access right now");
  expect(html).not.toContain("Private Couple content");
  expect(html).not.toContain("Please sign in");
  expect(mocks.calls.filter(([operation]) => operation === "insert")).toHaveLength(1);
  expect(mocks.wedding).toHaveBeenCalledOnce();
});
