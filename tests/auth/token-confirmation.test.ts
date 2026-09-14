// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  verifyOtp: vi.fn(),
  getClaims: vi.fn(),
  profile: vi.fn(),
  cookies: [] as Array<{ name: string; value: string }>,
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => mocks.cookies }) }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { verifyOtp: mocks.verifyOtp, getClaims: mocks.getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import ConfirmEmailPage from "@/app/auth/confirm/page";
import { confirmEmailToken } from "@/lib/actions/email-confirmation";
import { initialAuthState } from "@/lib/actions/auth-state";
import { verifiedEmailLoginMessage } from "@/lib/auth/email-confirmation";

function verifiedUser(role: "couple" | "vendor") {
  return { id: `${role}-id`, user_metadata: { role } };
}

async function submit(tokenHash = "signup-token", type: "email" | "recovery" = "email") {
  return confirmEmailToken(tokenHash, type, initialAuthState, new FormData());
}

async function redirectTarget(action: () => Promise<unknown>) {
  try {
    await action();
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies = [];
  mocks.configured.mockReturnValue(true);
  const user = verifiedUser("couple");
  mocks.verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "session" } }, error: null });
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: user.id } }, error: null });
  mocks.profile.mockResolvedValue({ data: { id: user.id, role: "couple" }, error: null });
});

describe("prefetch-safe confirmation page", () => {
  it.each(["email", "recovery"] as const)("renders a %s confirmation without consuming the token", async type => {
    const page = await ConfirmEmailPage({ searchParams: Promise.resolve({ token_hash: "scanner-safe-token", type }) });
    const panel = page.props.children;

    expect(panel.props.type).toBe(type);
    expect(panel.props.action).toEqual(expect.any(Function));
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { type: "email" },
    { token_hash: "value" },
    { token_hash: "value", type: "magiclink" },
    { token_hash: "contains whitespace", type: "email" },
  ])("renders a fail-closed page for malformed parameters without Auth activity", async searchParams => {
    const page = await ConfirmEmailPage({ searchParams: Promise.resolve(searchParams) });
    const panel = page.props.children;

    expect(panel.props.action).toBeUndefined();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});

describe("signup token confirmation submission", () => {
  it("verifies a Couple exactly once and enters the Couple Dashboard", async () => {
    expect(await redirectTarget(() => submit())).toBe("/wedding");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-token", type: "email" });
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  });

  it("uses the stored Vendor profile and ignores URL-only role or destination input", async () => {
    const user = verifiedUser("vendor");
    mocks.verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "session" } }, error: null });
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: user.id } }, error: null });
    mocks.profile.mockResolvedValue({ data: { id: user.id, role: "vendor" }, error: null });

    const page = await ConfirmEmailPage({
      searchParams: Promise.resolve({ token_hash: "vendor-token", type: "email", role: "couple", next: "https://evil.example" }),
    });
    expect(await redirectTarget(() => page.props.children.props.action(initialAuthState, new FormData()))).toBe("/vendor");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("continues from an already valid session without verifying the consumed token again", async () => {
    mocks.cookies = [{ name: "sb-project-auth-token", value: "session" }];
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "couple-id" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { id: "couple-id", role: "couple" }, error: null });

    expect(await redirectTarget(() => submit("already-used"))).toBe("/wedding");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("returns a retryable failure before verification when an existing session cannot be resolved", async () => {
    mocks.cookies = [{ name: "sb-project-auth-token", value: "session" }];
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: { status: 503 } });

    await expect(submit()).resolves.toEqual(expect.objectContaining({ status: "error", message: expect.stringContaining("temporarily unavailable") }));
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("uses the controlled Login fallback only after provider-confirmed verification when cookie-backed claims fail", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: { status: 503 } });

    const target = new URL(`https://app.example${await redirectTarget(() => submit())}`);
    expect(target.pathname).toBe("/auth/couple");
    expect(target.searchParams.get("mode")).toBe("login");
    expect(target.searchParams.get("message")).toBe(verifiedEmailLoginMessage);
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it.each([
    [null, "profile"],
    [{ id: "couple-id", role: "admin" }, "profile"],
  ] as const)("keeps a missing or inconsistent profile fail-closed", async (data, issue) => {
    mocks.profile.mockResolvedValue({ data, error: null });
    expect(await redirectTarget(() => submit())).toBe(`/auth/verification?issue=${issue}`);
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("keeps profile-query failures separate from invalid-token failures", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    expect(await redirectTarget(() => submit())).toBe("/auth/verification?issue=profile");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ code: "otp_expired", status: 403 }, "expired"],
    [{ code: "otp_invalid", status: 403 }, "invalid"],
  ] as const)("routes a genuine provider %s result to the controlled state", async (error, issue) => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error });
    expect(await redirectTarget(() => submit("bad"))).toBe(`/auth/verification?issue=${issue}`);
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("returns a controlled retryable result for provider and transport failures", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "provider_down", status: 503 } });
    await expect(submit()).resolves.toEqual(expect.objectContaining({ status: "error", message: expect.stringContaining("temporarily unavailable") }));
    mocks.verifyOtp.mockRejectedValue(new Error("private transport detail"));
    await expect(submit()).resolves.toEqual(expect.objectContaining({ status: "error", message: expect.not.stringContaining("private") }));
  });
});

describe("recovery token confirmation submission", () => {
  it("verifies once and opens the existing New Password form", async () => {
    expect(await redirectTarget(() => submit("recovery-token", "recovery"))).toBe("/auth/reset-password");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "recovery-token", type: "recovery" });
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("continues an already valid recovery session without verifying again", async () => {
    mocks.cookies = [{ name: "sb-project-auth-token", value: "session" }];
    expect(await redirectTarget(() => submit("already-used", "recovery"))).toBe("/auth/reset-password");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("never opens the reset form when the new recovery session is unavailable", async () => {
    const user = verifiedUser("vendor");
    mocks.verifyOtp.mockResolvedValue({ data: { user, session: null }, error: null });
    expect(await redirectTarget(() => submit("recovery-token", "recovery"))).toBe("/auth/reset-password?issue=unavailable");
  });

  it.each([
    [{ code: "otp_expired", status: 403 }, "expired"],
    [{ code: "otp_invalid", status: 403 }, "invalid"],
  ] as const)("keeps genuine recovery %s handling controlled", async (error, issue) => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error });
    expect(await redirectTarget(() => submit("bad", "recovery"))).toBe(`/auth/reset-password?issue=${issue}`);
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("keeps a temporary recovery provider failure off the New Password form", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "provider_down", status: 503 } });
    await expect(submit("recovery-token", "recovery"))
      .resolves.toEqual(expect.objectContaining({ status: "error", message: expect.stringContaining("temporarily unavailable") }));
  });
});
