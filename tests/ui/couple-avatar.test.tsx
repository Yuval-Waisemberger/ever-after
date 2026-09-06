import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoupleAvatar } from "@/components/couple/couple-avatar";
import { CoupleProfileMenu } from "@/components/couple/couple-profile-menu";
import { COUPLE_AVATAR_CHOICES, COUPLE_AVATAR_LABELS } from "@/lib/domain/couple-identity";

const parse = (markup: string) => new DOMParser().parseFromString(markup, "text/html");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Couple avatar presentation", () => {
  it("renders each approved icon as the photo-free fallback", () => {
    for (const choice of COUPLE_AVATAR_CHOICES) {
      const document = parse(renderToStaticMarkup(<CoupleAvatar choice={choice} />));
      const avatar = document.querySelector('[role="img"]')!;
      expect(avatar.getAttribute("data-avatar-source")).toBe("icon");
      expect(avatar.getAttribute("data-avatar-choice")).toBe(choice);
      expect(avatar.getAttribute("aria-label")).toBe(`${COUPLE_AVATAR_LABELS[choice]} Couple icon`);
      expect(document.querySelector(`[data-illustration="${choice}"]`)).not.toBeNull();
    }
  });

  it("uses logo-inspired wedding details in each people icon", () => {
    const brideAndGroom = renderToStaticMarkup(<CoupleAvatar choice="woman_man" />);
    const twoBrides = renderToStaticMarkup(<CoupleAvatar choice="woman_woman" />);
    const twoGrooms = renderToStaticMarkup(<CoupleAvatar choice="man_man" />);
    expect(brideAndGroom).toContain('data-illustration="woman_man"');
    expect(brideAndGroom).toContain('fill="currentColor"');
    expect(twoBrides).not.toContain('fill="currentColor"');
    expect(twoGrooms.match(/fill="currentColor"/g)).toHaveLength(2);
  });

  it("renders an authenticated photo URL without exposing a storage path field", () => {
    const signedUrl = "https://example.supabase.co/storage/v1/object/sign/couple-media/owner/avatar.jpg?token=short-lived";
    const document = parse(renderToStaticMarkup(<CoupleAvatar choice="heart" photoUrl={signedUrl} />));
    const avatar = document.querySelector('[role="img"]')!;
    expect(avatar.getAttribute("data-avatar-source")).toBe("photo");
    expect(avatar.getAttribute("aria-label")).toBe("Couple photo");
    expect(document.querySelector("img")?.getAttribute("src")).toContain("token=short-lived");
    expect(document.querySelector('input[name="avatar_storage_path"]')).toBeNull();
  });

  it("falls back to the selected icon when a private image cannot load", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<CoupleAvatar choice="woman_woman" photoUrl="https://example.invalid/private-photo" />));
    expect(container.querySelector('[data-avatar-source="photo"]')).not.toBeNull();
    await act(async () => container.querySelector("img")?.dispatchEvent(new Event("error")));
    expect(container.querySelector('[data-avatar-source="icon"]')?.getAttribute("aria-label")).toBe("Bride + Bride Couple icon");
    expect(container.querySelector("img")).toBeNull();
    await act(async () => root.unmount());
  });

  it("opens an accessible profile action and dismisses it with Escape or outside click", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<CoupleProfileMenu choice="woman_man" photoUrl={null} />));
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Change couple profile"]')!;
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('a[href="/settings#couple-profile"]')?.textContent).toBe("Change profile");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await act(async () => trigger.click());
    await act(async () => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    await act(async () => root.unmount());
    container.remove();
  });
});
