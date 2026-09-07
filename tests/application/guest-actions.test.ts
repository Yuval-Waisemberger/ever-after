// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnedWedding: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  result: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.getOwnedWedding }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteGuest, saveGuest } from "@/lib/actions/guests";

const weddingId = "11111111-1111-4111-8111-111111111111";
const guestId = "22222222-2222-4222-8222-222222222222";

function guestForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ fullName: "QA Household", invitedCount: "2", rsvpStatus: "invited", ...overrides })) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOwnedWedding.mockResolvedValue({ id: weddingId });
  const chain = { eq: mocks.eq, select: () => chain, single: mocks.result, maybeSingle: mocks.result };
  mocks.result.mockResolvedValue({ data: { id: guestId }, error: null });
  mocks.eq.mockReturnValue(chain);
  mocks.insert.mockReturnValue(chain);
  mocks.update.mockReturnValue(chain);
  mocks.delete.mockReturnValue(chain);
  mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update, delete: mocks.delete });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`REDIRECT:${path}`); });
});

describe("Guest actions", () => {
  it.each([null, { message: "private database detail" }])("rejects missing/forged rows and read errors without false success", async error => {
    mocks.result.mockResolvedValue({ data: null, error });
    const result = await saveGuest({ status: "idle" }, guestForm({ id: guestId }));
    expect(result.status).toBe("error");
    expect(JSON.stringify(result)).not.toContain("private database detail");
    await expect(deleteGuest(guestForm({ id: guestId }))).rejects.toThrow("The guest could not be deleted");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("creates a normalized invitation party for the owned wedding", async () => {
    await expect(saveGuest({ status: "idle" }, guestForm({ partyName: "  ", email: " " }))).rejects.toThrow("REDIRECT:/guests?guest=added");
    expect(mocks.from).toHaveBeenCalledWith("guests");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ wedding_id: weddingId, full_name: "QA Household", party_name: null, email: null, attending_count: null }));
  });

  it("updates attendance while scoping both guest ID and wedding ID", async () => {
    await expect(saveGuest({ status: "idle" }, guestForm({ id: guestId, invitedCount: "5", rsvpStatus: "attending", attendingCount: "3" }))).rejects.toThrow("REDIRECT:/guests?guest=updated");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ invited_count: 5, attending_count: 3 }));
    expect(mocks.eq).toHaveBeenCalledWith("id", guestId);
    expect(mocks.eq).toHaveBeenCalledWith("wedding_id", weddingId);
  });

  it("does not query the database for an invalid RSVP/count combination", async () => {
    const result = await saveGuest({ status: "idle" }, guestForm({ rsvpStatus: "attending", attendingCount: "3", invitedCount: "2" }));
    expect(result.status).toBe("error");
    expect(result.errors?.attendingCount?.[0]).toBe("Attending cannot exceed invited");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes only the requested guest in the owned wedding", async () => {
    const form = new FormData();
    form.set("id", guestId);
    await deleteGuest(form);
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("id", guestId);
    expect(mocks.eq).toHaveBeenCalledWith("wedding_id", weddingId);
  });
});
