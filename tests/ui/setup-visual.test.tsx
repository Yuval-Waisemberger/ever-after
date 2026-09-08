import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeddingDraft } from "@/components/wedding/wedding-draft";
import { SetupProgress } from "@/components/wedding/setup-wizard";
import type { WeddingFieldValues } from "@/components/wedding/wedding-fields";

vi.mock("@/lib/actions/wedding", () => ({ completeWeddingSetup: vi.fn(), skipWeddingSetup: vi.fn() }));

function progress(values: WeddingFieldValues, step = 0) {
  const markup = renderToStaticMarkup(<WeddingDraft values={values}><SetupProgress step={step} /></WeddingDraft>);
  return new DOMParser().parseFromString(markup, "text/html").querySelector('[role="progressbar"]')!;
}

describe("Setup details progress presentation", () => {
  it("does not count navigation through empty steps as details completed", () => {
    expect(progress({}, 0).getAttribute("aria-valuenow")).toBe("0");
    expect(progress({}, 4).getAttribute("aria-valuenow")).toBe("0");
  });
  it("counts actual populated sections and preserves progress when navigating back", () => {
    const values = { weddingDate: "2027-04-16", styles: ["Elegant"], priorities: ["Photography"] };
    expect(progress(values, 0).getAttribute("aria-valuenow")).toBe("3");
    expect(progress(values, 3).getAttribute("aria-valuenow")).toBe("3");
    expect(progress(values).firstElementChild?.getAttribute("style")).toContain("60%");
  });
  it("requires the three practical details for the characteristics section", () => {
    expect(progress({ guestCount: 200 }).getAttribute("aria-valuenow")).toBe("0");
    expect(progress({ guestCount: 200, preferredArea: "north", eventType: "evening" }).getAttribute("aria-valuenow")).toBe("1");
    expect(progress({ guestCount: 99999, preferredArea: "north", eventType: "evening" }).getAttribute("aria-valuenow")).toBe("0");
  });
  it("counts a real zero budget, distinguishes missing budget, and explains optional fields", () => {
    expect(progress({ totalBudgetMinor: 0 }).getAttribute("aria-valuenow")).toBe("1");
    expect(progress({ totalBudgetMinor: null }).getAttribute("aria-valuenow")).toBe("0");
    expect(progress({}).getAttribute("aria-valuetext")).toContain("Date and budget remain optional");
  });
  it("does not show an over-limit priority selection as a completed section", () => {
    expect(progress({ priorities: ["a", "b", "c", "d", "e"] }).getAttribute("aria-valuenow")).toBe("0");
  });
});
