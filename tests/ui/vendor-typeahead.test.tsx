import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VendorTypeahead } from "@/components/wedding/vendor-typeahead";

const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/setup-bookings", () => ({ searchSetupVendors: search }));
const result = (name = "Alma", count = 1) => ({ status: "success", hasMore: false, vendors: Array.from({ length: count }, (_, i) => ({ id: `vendor-${i}`, businessName: `${name} ${i}`, city: "Jerusalem", subcategory: "Makeup & Hair" })) });
let root: Root, host: HTMLDivElement;
const select = vi.fn();
const input = () => host.querySelector("input")!;
async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function key(value: string) { await act(async () => { input().dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true })); }); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers(); search.mockReset().mockResolvedValue(result()); select.mockReset();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<VendorTypeahead category="makeup" subcategory="makeup-hair" disabled={false} onSelect={select} />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

describe("Setup vendor typeahead", () => {
  it("requires two meaningful characters and debounces the bounded service search", async () => {
    await type(" a - "); await tick(500); expect(search).not.toHaveBeenCalled();
    await type("al"); await tick(299); expect(search).not.toHaveBeenCalled();
    await type("alma"); await tick(299); expect(search).not.toHaveBeenCalled();
    await tick(1);
    expect(search).toHaveBeenCalledExactlyOnceWith({ category: "makeup", subcategory: "makeup-hair", search: "alma", page: 1 });
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(1);
  });
  it("limits suggestions, supports arrows/Enter/Escape, and clears selection when typing", async () => {
    search.mockResolvedValue(result("Alma", 12));
    await type("al"); await tick(300);
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(6);
    await key("ArrowUp"); expect(input().getAttribute("aria-activedescendant")).toMatch(/-5$/);
    expect(select).not.toHaveBeenCalledWith("vendor-5");
    await key("ArrowDown"); await key("Enter");
    expect(select).toHaveBeenLastCalledWith("vendor-0"); expect(host.textContent).toContain("Selected: Alma 0");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    await type("new"); expect(select).toHaveBeenLastCalledWith(""); await tick(300);
    await key("Escape"); expect(host.querySelector('[role="listbox"]')).toBeNull();
  });
  it("ignores an older response after newer results arrive", async () => {
    let finishOld!: (value: ReturnType<typeof result>) => void;
    search.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce(result("Newest"));
    await type("al"); await tick(300); expect(host.textContent).toContain("Searching…");
    await type("alma"); await tick(300); expect(host.textContent).toContain("Newest");
    await act(async () => finishOld(result("Old")));
    expect(host.textContent).not.toContain("Old"); expect(host.textContent).toContain("Newest");
  });
  it("shows a concise empty state and keeps errors separate from empty results", async () => {
    search.mockResolvedValueOnce(result("None", 0)).mockRejectedValueOnce(new Error("private transport detail"));
    await type("zz"); await tick(300); expect(host.textContent).toContain("No matching vendors");
    expect(host.textContent).not.toContain("Previous");
    await type("error"); await tick(300); expect(host.textContent).toContain("Search is unavailable");
    expect(host.textContent).not.toContain("private transport detail"); expect(host.textContent).not.toContain("No matching vendors");
  });
  it("invalidates pending searches when service changes or the component unmounts", async () => {
    await type("al"); await tick(150);
    await act(async () => root.render(<VendorTypeahead key="dj" category="dj" subcategory="djs" disabled={false} onSelect={select} />));
    await tick(500); expect(search).not.toHaveBeenCalled();
    await type("dj"); await tick(300);
    expect(search).toHaveBeenLastCalledWith({ category: "dj", subcategory: "djs", search: "dj", page: 1 });
  });
});
