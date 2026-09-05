// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {
  updateUser: mocks.updateUser,
  signOut: mocks.signOut,
  resetPasswordForEmail: mocks.resetPasswordForEmail,
} }) }));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

import { changePassword, requestPasswordReset, resetPassword } from "@/lib/actions/auth";

const idle = { status: "idle" as const };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const validPasswords = { password: "new-password-123", confirmPassword: "new-password-123" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example");
  mocks.configured.mockReturnValue(true);
  mocks.profile.mockResolvedValue({ id: "user-id", role: "couple", displayName: "Couple" });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("password change security", () => {
  it("globally signs out after a successful change and requires a fresh Couple login", async () => {
    await expect(changePassword(idle, form(validPasswords))).rejects.toThrow(/REDIRECT:\/auth\/couple\?mode=login/);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: validPasswords.password });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("routes a Vendor back through the normal Vendor login", async () => {
    mocks.profile.mockResolvedValue({ id: "vendor-id", role: "vendor", displayName: "Vendor" });
    await expect(changePassword(idle, form(validPasswords))).rejects.toThrow(/REDIRECT:\/auth\/vendor\?mode=login/);
  });

  it("does not destroy the session when the password update fails", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "private provider detail" } });
    const result = await changePassword(idle, form(validPasswords));
    expect(result).toEqual({ status: "error", message: "Your password could not be changed. Please sign in again and retry." });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("clears the local session if global revocation reports an error", async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { message: "revocation unavailable" } }).mockResolvedValueOnce({ error: null });
    await expect(changePassword(idle, form(validPasswords))).rejects.toThrow("REDIRECT:");
    expect(mocks.signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(mocks.signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });
});

describe("forgot-password request", () => {
  it("uses the trusted environment origin and returns generic confirmation", async () => {
    const result = await requestPasswordReset(idle, form({ email: "person@example.com", audience: "vendor" }));
    expect(result).toEqual({ status: "success", message: "If an account exists for this email, we’ve sent a password reset link." });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", {
      redirectTo: "https://app.example/auth/callback?flow=recovery&audience=vendor",
    });
  });

  it("does not reveal whether an address exists", async () => {
    const input = form({ email: "unknown@example.com", audience: "couple" });
    const expected = await requestPasswordReset(idle, input);
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { status: 400, message: "User does not exist" } });
    expect(await requestPasswordReset(idle, input)).toEqual(expected);
  });

  it("validates before contacting Supabase and hides provider failures", async () => {
    expect((await requestPasswordReset(idle, form({ email: "invalid" }))).status).toBe("error");
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { status: 500, message: "private provider detail" } });
    const result = await requestPasswordReset(idle, form({ email: "person@example.com" }));
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("private provider detail");
  });
});

describe("set-new-password recovery", () => {
  it("validates password length and matching values before updating", async () => {
    expect((await resetPassword(idle, form({ password: "short", confirmPassword: "different" }))).status).toBe("error");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("updates, globally signs out and redirects through the stored role login", async () => {
    mocks.profile.mockResolvedValue({ id: "vendor-id", role: "vendor", displayName: "Vendor" });
    await expect(resetPassword(idle, form(validPasswords))).rejects.toThrow(/REDIRECT:\/auth\/vendor\?mode=login/);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: validPasswords.password });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("rejects an invalid or expired recovery session without changing a password", async () => {
    mocks.profile.mockResolvedValue(null);
    const result = await resetPassword(idle, form(validPasswords));
    expect(result.message).toContain("invalid or has expired");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("does not sign out if Supabase rejects the new password", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "private provider detail" } });
    const result = await resetPassword(idle, form(validPasswords));
    expect(result.message).not.toContain("private provider detail");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
