// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  verifyOtp: vi.fn(),
  getClaims: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp, getClaims: mocks.getClaims } }),
}));
vi.mock("@/lib/auth/user", () => ({ resolveAuthenticatedProfile: mocks.profile }));

import { verifiedEmailLoginMessage } from "@/lib/auth/email-confirmation";
import { GET } from "@/app/auth/confirm/route";

const request = (query: string) => GET(new Request(`https://app.example/auth/confirm?${query}`));
const location = async (query: string) => (await request(query)).headers.get("location");

function verifiedUser(role: "couple" | "vendor") {
  return { id: `${role}-id`, user_metadata: { role } };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example");
  mocks.configured.mockReturnValue(true);
  const user = verifiedUser("couple");
  mocks.verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "session" } }, error: null });
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: user.id } }, error: null });
  mocks.profile.mockResolvedValue({ id: user.id, role: "couple" });
});

afterEach(() => vi.unstubAllEnvs());

describe("signup token-hash confirmation", () => {
  it("verifies a Couple once, confirms the persisted session and enters the Couple Dashboard", async () => {
    expect(await location("token_hash=signup-token&type=email")).toBe("https://app.example/wedding");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-token", type: "email" });
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
    expect(mocks.profile).toHaveBeenCalledWith(expect.anything(), "couple-id");
  });

  it("uses the stored Vendor profile, not URL role or destination hints", async () => {
    const user = verifiedUser("vendor");
    mocks.verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "session" } }, error: null });
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: user.id } }, error: null });
    mocks.profile.mockResolvedValue({ id: user.id, role: "vendor" });

    expect(await location("token_hash=vendor-token&type=email&role=couple&next=https%3A%2F%2Fevil.example"))
      .toBe("https://app.example/vendor");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("builds redirects from the trusted configured origin, not the request Host", async () => {
    const response = await GET(new Request("https://untrusted.example/auth/confirm?token_hash=value&type=email"));
    expect(response.headers.get("location")).toBe("https://app.example/wedding");
  });

  it("uses the verified-email Login fallback when the provider confirms the user but no session is available", async () => {
    const user = verifiedUser("couple");
    mocks.verifyOtp.mockResolvedValue({ data: { user, session: null }, error: null });

    const target = new URL((await location("token_hash=signup-token&type=email"))!);
    expect(target.pathname).toBe("/auth/couple");
    expect(target.searchParams.get("mode")).toBe("login");
    expect(target.searchParams.get("message")).toBe(verifiedEmailLoginMessage);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("uses the same controlled fallback if the newly written session is not recognized", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: { status: 503 } });
    const target = new URL((await location("token_hash=signup-token&type=email"))!);
    expect(target.pathname).toBe("/auth/couple");
    expect(target.searchParams.get("message")).toBe(verifiedEmailLoginMessage);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("keeps profile resolution fail-closed without calling the token invalid", async () => {
    mocks.profile.mockResolvedValue(null);
    expect(await location("token_hash=signup-token&type=email")).toBe("https://app.example/auth/verification?issue=profile");
  });

  it.each([
    [{ code: "otp_expired", status: 403 }, "expired"],
    [{ code: "otp_invalid", status: 403 }, "invalid"],
    [{ code: "over_request_rate_limit", status: 429 }, "unavailable"],
    [{ code: "unexpected_failure", status: 500 }, "unavailable"],
  ] as const)("maps provider token failures to the controlled %s state", async (error, issue) => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error });
    expect(await location("token_hash=bad&type=email")).toBe(`https://app.example/auth/verification?issue=${issue}`);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("does not expose thrown provider or transport failures as invalid tokens", async () => {
    mocks.verifyOtp.mockRejectedValue(new Error("private transport detail"));
    expect(await location("token_hash=value&type=email")).toBe("https://app.example/auth/verification?issue=unavailable");
  });

  it.each(["", "type=email", "token_hash=value", "token_hash=value&type=magiclink"])(
    "rejects missing or unsupported parameters without verifying: %s",
    async query => {
      expect(await location(query)).toBe("https://app.example/auth/verification?issue=invalid");
      expect(mocks.verifyOtp).not.toHaveBeenCalled();
    },
  );
});

describe("password-recovery token-hash confirmation", () => {
  it("verifies a recovery token once and opens the existing New Password form", async () => {
    expect(await location("token_hash=recovery-token&type=recovery")).toBe("https://app.example/auth/reset-password");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "recovery-token", type: "recovery" });
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("ignores role and destination parameters and never enters a Dashboard", async () => {
    expect(await location("token_hash=recovery-token&type=recovery&role=vendor&next=%2Fvendor"))
      .toBe("https://app.example/auth/reset-password");
  });

  it("does not show the password form when the recovery session is missing or unrecognized", async () => {
    const user = verifiedUser("vendor");
    mocks.verifyOtp.mockResolvedValue({ data: { user, session: null }, error: null });
    expect(await location("token_hash=recovery-token&type=recovery"))
      .toBe("https://app.example/auth/reset-password?issue=unavailable");

    mocks.verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "session" } }, error: null });
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "different-user" } }, error: null });
    expect(await location("token_hash=recovery-token&type=recovery"))
      .toBe("https://app.example/auth/reset-password?issue=unavailable");
  });

  it.each([
    [{ code: "otp_expired", status: 403 }, "expired"],
    [{ code: "otp_invalid", status: 403 }, "invalid"],
    [{ code: "over_request_rate_limit", status: 429 }, "unavailable"],
  ] as const)("keeps recovery %s handling controlled", async (error, issue) => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error });
    expect(await location("token_hash=bad&type=recovery"))
      .toBe(`https://app.example/auth/reset-password?issue=${issue}`);
  });

  it("rejects a missing recovery token without contacting the provider", async () => {
    expect(await location("type=recovery")).toBe("https://app.example/auth/reset-password?issue=invalid");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
});
