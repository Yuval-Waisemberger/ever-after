// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  cookieAdapter: null as null | {
    getAll: () => unknown[];
    setAll: (cookies: Array<{ name: string; value: string; options?: object }>) => void;
  },
  configured: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.configured,
  getSupabaseConfig: () => ({ url: "https://project.example", publishableKey: "public-key" }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: typeof mocks.cookieAdapter }) => {
    mocks.cookieAdapter = options.cookies;
    return { auth: { getClaims: mocks.getClaims } };
  },
}));

const responses: Array<{
  cookies: { set: ReturnType<typeof vi.fn> };
}> = [];

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => {
      const response = { cookies: { set: vi.fn() } };
      responses.push(response);
      return response;
    },
  },
}));

import { updateSession } from "@/lib/supabase/proxy";

describe("Supabase session refresh proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responses.length = 0;
    mocks.cookieAdapter = null;
    mocks.configured.mockReturnValue(true);
    mocks.getClaims.mockImplementation(async () => {
      mocks.cookieAdapter?.setAll([
        { name: "sb-project-auth-token", value: "refreshed", options: { httpOnly: true } },
      ]);
      return { data: { claims: { sub: "user-id" } } };
    });
  });

  it("verifies claims immediately and propagates refreshed cookies to request and response", async () => {
    const requestCookieSet = vi.fn();
    const request = {
      cookies: { getAll: () => [], set: requestCookieSet },
    };

    const response = await updateSession(request as never);

    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(requestCookieSet).toHaveBeenCalledWith("sb-project-auth-token", "refreshed");
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-project-auth-token",
      "refreshed",
      { httpOnly: true },
    );
  });
});
