// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  cookieSet: vi.fn(),
  cookies: new Map<string, { value: string; options?: object }>(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({ url: "https://project.example", publishableKey: "public-key" }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...mocks.cookies].map(([name, entry]) => ({ name, value: entry.value })),
    set: (name: string, value: string, options?: object) => {
      mocks.cookieSet(name, value, options);
      mocks.cookies.set(name, { value, options });
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: {
    cookies: {
      getAll: () => Array<{ name: string; value: string }>;
      setAll: (values: Array<{ name: string; value: string; options?: object }>) => void;
    };
  }) => ({
    auth: {
      verifyOtp: mocks.verifyOtp.mockImplementation(async () => {
        options.cookies.setAll([{ name: "sb-project-auth-token", value: "verified-session", options: { httpOnly: true } }]);
        return {
          data: {
            user: { id: "couple-id", user_metadata: { role: "couple" } },
            session: { access_token: "verified-session" },
          },
          error: null,
        };
      }),
      getClaims: async () => ({
        data: {
          claims: options.cookies.getAll().some(cookie => cookie.name === "sb-project-auth-token")
            ? { sub: "couple-id" }
            : null,
        },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "couple-id",
              role: "couple",
              display_name: "Fixture Couple",
              avatar_choice: null,
              avatar_storage_path: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { confirmEmailToken } from "@/lib/actions/email-confirmation";
import { initialAuthState } from "@/lib/actions/auth-state";
import { requireRole } from "@/lib/auth/user";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.clear();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example");
});

describe("token confirmation session handoff", () => {
  it("writes the verified session cookie and the first protected read recognizes it", async () => {
    await expect(confirmEmailToken("fixture-token", "email", initialAuthState, new FormData()))
      .rejects.toThrow("REDIRECT:/wedding");
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "sb-project-auth-token",
      "verified-session",
      { httpOnly: true },
    );

    await expect(requireRole("couple")).resolves.toMatchObject({ id: "couple-id", role: "couple" });
  });
});
