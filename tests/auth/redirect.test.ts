import { afterEach, describe, expect, it, vi } from "vitest";
import { passwordRecoveryCallbackUrl, safeInternalPath, signupCallbackUrl } from "@/lib/auth/redirect";

afterEach(() => vi.unstubAllEnvs());
describe("internal Auth redirects", () => {
  it.each(["/", "/wedding", "/wedding/setup", "/wedding/details", "/vendor", "/vendor/profile", "/vendors?category=venues#marketplace-results", "/tasks"])("accepts %s", path => {
    expect(safeInternalPath(path)).toBe(path);
  });
  it.each([undefined, null, 7, [], "", "vendors", "//example.com", "/\\example.com", "\\\\example.com", "https://example.com", "http://example.com", "/%2fexample.com", "/%5cexample.com", "%2f%2fexample.com", "/%252fexample.com", "/%255cexample.com", "/../ //example.com", "/..//example.com", "/\n/example.com", "/%0a/example.com", "/%", "/%zz", "/" + "a".repeat(2048)])("rejects unsafe/malformed %j", path => {
    expect(safeInternalPath(path)).toBe("/");
    expect(safeInternalPath(path, "/wedding/setup")).toBe("/wedding/setup");
  });
  it.each(["http://localhost:3000", "https://demo.vercel.app", "https://everafter.work"])("uses configured origin %s", origin => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    expect(signupCallbackUrl("couple")).toBe(`${origin}/auth/callback?audience=couple`);
    expect(signupCallbackUrl("vendor")).toBe(`${origin}/auth/callback?audience=vendor`);
    expect(passwordRecoveryCallbackUrl()).toBe(`${origin}/auth/callback?flow=recovery`);
    expect(passwordRecoveryCallbackUrl("vendor")).toBe(`${origin}/auth/callback?flow=recovery&audience=vendor`);
  });
  it.each(["", "not a URL", "//example.com", "javascript:alert(1)", "https://user:password@example.com", "https://example.com/path", "https://example.com/?next=bad", "https://example.com/#fragment"])("rejects invalid origin configuration %s", origin => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    expect(() => signupCallbackUrl("couple")).toThrow();
    expect(() => passwordRecoveryCallbackUrl()).toThrow();
  });
});
