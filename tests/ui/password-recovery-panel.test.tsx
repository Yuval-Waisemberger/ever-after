import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const actionState = vi.hoisted(() => ({
  current: { status: "idle" as "idle" | "error" | "success", message: undefined as string | undefined },
}));

vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useActionState: () => [actionState.current, vi.fn()],
}));
vi.mock("@/lib/actions/auth", () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));

import { ForgotPasswordPanel, ResetPasswordPanel } from "@/components/auth/password-recovery-panel";

const parse = () => new DOMParser().parseFromString(renderToStaticMarkup(<ForgotPasswordPanel audience="couple" />), "text/html");

describe("Forgot Password confirmation", () => {
  beforeEach(() => {
    actionState.current = { status: "idle", message: undefined };
  });

  it("does not show the Spam or Junk notice before a reset request succeeds", () => {
    const document = parse();
    expect(document.querySelector(".password-reset-spam-notice")).toBeNull();
    expect(document.querySelector("button[type=submit]")?.textContent).toBe("Send password reset link");
  });

  it("keeps the generic confirmation separate from the prominent Spam or Junk notice", () => {
    actionState.current = {
      status: "success",
      message: "If an account exists for this email, we’ve sent a password reset link.",
    };
    const document = parse();
    expect(document.querySelector('[role="status"]')?.textContent).toBe("If an account exists for this email, we’ve sent a password reset link.");
    const notice = document.querySelector('[role="note"].password-reset-spam-notice');
    expect(notice?.textContent).toBe("Important: A password reset email may arrive in your Spam or Junk folder. Check those folders if needed.");
    expect(notice?.classList.contains("text-base")).toBe(true);
    expect(notice?.classList.contains("font-semibold")).toBe(true);
    expect(document.querySelector("button[type=submit]")?.textContent).toBe("Send another reset link");
  });
});

describe("Set New Password states", () => {
  beforeEach(() => {
    actionState.current = { status: "idle", message: undefined };
  });

  it("shows the form for an available recovery session without an expired-link message", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<ResetPasswordPanel audience="couple" available />), "text/html");
    expect(document.querySelector("h1")?.textContent).toBe("Set a new password");
    expect(document.querySelector('input[name="password"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain("invalid, expired or has already been used");
  });

  it("retains the controlled error for a genuinely expired recovery link", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<ResetPasswordPanel audience="couple" available={false} issue="expired" />), "text/html");
    expect(document.querySelector("h1")?.textContent).toBe("This reset link has expired");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("invalid, expired or has already been used");
    expect(document.querySelector('a[href="/auth/couple?mode=login"]')?.textContent).toBe("Return to Login");
  });

  it("does not mislabel a temporary recovery-session failure as an invalid link", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<ResetPasswordPanel available={false} issue="unavailable" />), "text/html");
    expect(document.querySelector("h1")?.textContent).toBe("Password recovery is temporarily unavailable");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("secure password-recovery session");
    expect(document.body.textContent).not.toContain("invalid, expired or has already been used");
    expect(document.querySelector('input[name="password"]')).toBeNull();
  });
});
