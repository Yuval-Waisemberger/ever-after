import { act } from "react";
import { formatIls } from "@/lib/domain/budget";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { AnimatedValue } from "@/components/planning/animated-value";
import { TimelinePath } from "@/components/wedding/timeline-path";
import { DetailsSavedToast } from "@/components/wedding/details-saved-toast";
import { renderToStaticMarkup } from "react-dom/server";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("SSR exposes the exact financial value, including negative Available", () => {
  const html = renderToStaticMarkup(<AnimatedValue value={-120000} format="ils" />);
  expect(new DOMParser().parseFromString(html, "text/html").querySelector(".planning-value")?.getAttribute("aria-label")).toBe(formatIls(-120000));
  expect(html).toContain('aria-hidden="true"');
});
it("reduced motion immediately shows the real value and later updates without counting again", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const host = document.createElement("div"); const root = createRoot(host);
  await act(async () => root.render(<AnimatedValue value={20} />));
  expect(host.textContent).toBe("20");
  await act(async () => root.render(<AnimatedValue value={12} />));
  expect(host.textContent).toBe("12"); expect(host.firstElementChild?.getAttribute("aria-label")).toBe("12");
  await act(async () => root.unmount());
});
it("the Timeline path advances from scroll, never erases revealed progress, and cleans listeners", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  let frame: FrameRequestCallback = () => {};
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { frame = fn; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  let top = 600;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ top, height: 1800 } as DOMRect));
  const host = document.createElement("div"); const root = createRoot(host);
  await act(async () => root.render(<TimelinePath><li>One actual milestone</li></TimelinePath>));
  const path = host.querySelector("ol")!;
  const initial = Number(path.style.getPropertyValue("--timeline-progress"));
  top = -900; window.dispatchEvent(new Event("scroll")); frame(1);
  const progressed = Number(path.style.getPropertyValue("--timeline-progress")); expect(progressed).toBeGreaterThan(initial);
  top = 600; window.dispatchEvent(new Event("scroll")); frame(2);
  expect(Number(path.style.getPropertyValue("--timeline-progress"))).toBe(progressed);
  await act(async () => root.unmount()); expect(cancelAnimationFrame).toHaveBeenCalled();
});
it("save feedback is dismissible, names the saved result and has a real destination", () => {
  const html = renderToStaticMarkup(<DetailsSavedToast />);
  expect(html).toContain("Wedding details saved"); expect(html).toContain('href="/wedding/details"'); expect(html).toContain("Dismiss save confirmation");
});
