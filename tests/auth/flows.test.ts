// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  configured: vi.fn(), signUp: vi.fn(), resend: vi.fn(), exchange: vi.fn(), profile: vi.fn(), wedding: vi.fn(),
}));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { signUp: mocks.signUp, resend: mocks.resend, exchangeCodeForSession: mocks.exchange },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.wedding }) }) }),
}) }));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { signUpCouple, signUpVendor, resendVerification } from "@/lib/actions/auth";
import { GET } from "@/app/auth/callback/route";

const form = (values: Record<string, string>) => { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data; };
const common = { email: "test@example.com", password: "test-password", confirmPassword: "test-password" };
const couple = { ...common, partnerOneName: "First", partnerTwoName: "Second", displayName: "First & Second", partnerOnePhone: "", partnerTwoPhone: "", secondEmail: "" };
const vendor = { ...common, businessName: "Wedding Studio", contactName: "Owner", phone: "" };
const idle = { status: "idle" as const };
const callback = async (query = "code=local-test-code") => (await GET(new Request(`https://app.example/auth/callback?${query}`))).headers.get("location");
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example");
  mocks.configured.mockReturnValue(true);
  mocks.signUp.mockResolvedValue({ data: { user: { id: "user" }, session: null }, error: null });
  mocks.resend.mockResolvedValue({ error: null }); mocks.exchange.mockResolvedValue({ error: null });
  mocks.profile.mockResolvedValue({ id: "user", role: "couple" });
  mocks.wedding.mockResolvedValue({ data: { setup_status: "not_started" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("signup and resend (mocked provider, no network)", () => {
  it.each([[signUpCouple, couple], [signUpVendor, vendor]] as const)("does not expose signup provider/database errors", async (action, values) => {
    mocks.signUp.mockResolvedValue({ data: null, error: { message: "private trigger/database detail" } });
    const result = await action(idle, form(values));
    expect(result.status).toBe("error");
    expect(result.message).toContain("account could not be created");
    expect(JSON.stringify(result)).not.toContain("private trigger/database detail");
  });
  it.each([["couple", signUpCouple, couple], ["vendor", signUpVendor, vendor]] as const)("%s no-session signup preserves metadata and waits for email", async (role, action, values) => {
    expect(await action(idle, form(values))).toMatchObject({ status: "success", verificationEmail: common.email });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: `https://app.example/auth/callback?audience=${role}`, data: expect.objectContaining({ role, display_name: role === "couple" ? couple.displayName : vendor.businessName }) }) }));
  });
  it.each([[signUpCouple, couple, "/wedding/setup"], [signUpVendor, vendor, "/vendor"]] as const)("keeps immediate-session signup routing", async (action, values, target) => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "mock" } }, error: null });
    await expect(action(idle, form(values))).rejects.toThrow(`REDIRECT:${target}`);
  });
  it("does not call the provider with missing callback configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect((await signUpCouple(idle, form(couple))).status).toBe("error");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("validates resend input and respects disconnected mode", async () => {
    expect((await resendVerification(idle, form({ email: "bad", audience: "admin" }))).status).toBe("error");
    mocks.configured.mockReturnValue(false);
    expect((await resendVerification(idle, form({ email: common.email, audience: "couple" }))).status).toBe("error");
    expect(mocks.resend).not.toHaveBeenCalled();
  });
  it.each(["couple", "vendor"])("resends via Supabase with %s callback context", async audience => {
    expect((await resendVerification(idle, form({ email: common.email, audience }))).status).toBe("success");
    expect(mocks.resend).toHaveBeenCalledWith({ type: "signup", email: common.email, options: { emailRedirectTo: `https://app.example/auth/callback?audience=${audience}` } });
  });
  it("does not reveal account-specific resend errors", async () => {
    const input = form({ email: common.email, audience: "vendor" });
    const success = await resendVerification(idle, input);
    mocks.resend.mockResolvedValue({ error: { status: 400, message: "User does not exist" } });
    expect(await resendVerification(idle, input)).toEqual(success);
  });
  it("handles throttling and provider/network failure without raw error leakage", async () => {
    const input = form({ email: common.email, audience: "couple" });
    mocks.resend.mockResolvedValue({ error: { status: 429 } });
    expect((await resendVerification(idle, input)).message).toContain("wait");
    mocks.resend.mockResolvedValue({ error: { status: 500, message: "private provider detail" } });
    expect((await resendVerification(idle, input)).status).toBe("error");
    mocks.resend.mockRejectedValue(new Error("network detail"));
    expect((await resendVerification(idle, input)).message).not.toContain("network detail");
  });
});
describe("PKCE callback", () => {
  it("passes the SDK's per-flow verifier hint without using it for role routing", async () => {
    expect(await callback("code=ok&sb_flow_id=12345678-1234-4234-8234-123456789012")).toBe("https://app.example/wedding/setup");
    expect(mocks.exchange).toHaveBeenCalledWith("ok", { flowId: "12345678-1234-4234-8234-123456789012" });
  });
  it("routes a newly initialized Couple to setup", async () => { expect(await callback()).toBe("https://app.example/wedding/setup"); expect(mocks.exchange).toHaveBeenCalledWith("local-test-code"); });
  it.each(["skipped", "completed"])("does not restart %s setup", async status => {
    mocks.wedding.mockResolvedValue({ data: { setup_status: status }, error: null });
    expect(await callback()).toBe("https://app.example/wedding");
  });
  it("trusts stored Vendor role, not the audience hint", async () => {
    mocks.profile.mockResolvedValue({ id: "user", role: "vendor" });
    expect(await callback("code=ok&audience=couple")).toBe("https://app.example/vendor");
    expect(mocks.wedding).not.toHaveBeenCalled();
  });
  it("allows a safe explicit next path", async () => { expect(await callback("code=ok&next=%2Fvendors")).toBe("https://app.example/vendors"); });
  it("keeps password recovery separate from profile and role routing", async () => {
    expect(await callback("code=recovery-code&flow=recovery&audience=vendor")).toBe("https://app.example/auth/reset-password?audience=vendor");
    expect(mocks.exchange).toHaveBeenCalledWith("recovery-code");
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("sends expired password recovery links to the reset recovery state", async () => {
    expect(await callback("error=access_denied&error_code=otp_expired&flow=recovery&audience=couple")).toBe("https://app.example/auth/reset-password?issue=expired&audience=couple");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it.each(["//example.com", "/\\example.com", "https://example.com", "/%2fexample.com"])("rejects external next %s after exchange", async next => {
    expect(await callback(`code=ok&next=${encodeURIComponent(next)}`)).toBe("https://app.example/wedding/setup");
  });
  it("preserves Vendor context for expired provider links", async () => {
    expect(await callback("error=access_denied&error_code=otp_expired&audience=vendor")).toBe("https://app.example/auth/verification?issue=expired&audience=vendor");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("uses neutral recovery for unknown context and missing codes", async () => {
    expect(await callback("audience=admin")).toBe("https://app.example/auth/verification?issue=invalid");
  });
  it("handles invalid, expired, and thrown exchange failures", async () => {
    mocks.exchange.mockResolvedValue({ error: { code: "bad_code" } });
    expect(await callback()).toContain("issue=invalid");
    mocks.exchange.mockResolvedValue({ error: { code: "otp_expired" } });
    expect(await callback()).toContain("issue=expired");
    mocks.exchange.mockRejectedValue(new Error("private detail"));
    expect(await callback()).toBe("https://app.example/auth/verification?issue=invalid");
  });
  it("uses safe recovery if profile or wedding cannot be resolved", async () => {
    mocks.profile.mockResolvedValue(null); expect(await callback()).toContain("issue=profile");
    mocks.profile.mockResolvedValue({ id: "user", role: "couple" });
    mocks.wedding.mockResolvedValue({ data: null, error: { message: "missing" } });
    expect(await callback()).toContain("issue=profile");
  });
  it("does not exchange codes while disconnected", async () => {
    mocks.configured.mockReturnValue(false); expect(await callback()).toContain("issue=invalid"); expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
