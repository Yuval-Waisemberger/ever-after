import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BudgetExpenseSurface, BudgetMetrics } from "@/components/budget/budget-presentation";
import { GuestSummary } from "@/components/guests/guest-summary";
import { calculateBudgetSummary } from "@/lib/domain/budget";

vi.mock("@/components/planning/animated-value", () => ({ AnimatedValue: ({ value }: { value: number }) => <span>{value}</span> }));
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

describe("Budget and guest presentation follows real data", () => {
  it("uses financial impact for the bar, retaining money paid after unbooking", () => {
    const summary = calculateBudgetSummary(10000, [{ source: "booked_vendor", relationshipStatus: "rejected", committedAmountMinor: null, payments: [{ amountMinor: 2000, isPaid: true }] }]);
    const doc = parse(renderToStaticMarkup(<BudgetMetrics summary={summary} />));
    const bar = doc.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("20");
    expect(doc.querySelectorAll(".budget-metric")).toHaveLength(5);
    expect(doc.body.textContent).toContain("8000");
  });
  it("does not invent a budget ratio with no positive total", () => {
    for (const total of [null, 0]) expect(parse(renderToStaticMarkup(<BudgetMetrics summary={calculateBudgetSummary(total, [])} />)).querySelector('[role="progressbar"]')).toBeNull();
  });
  it("shows real attendance ratio while keeping the wedding estimate independent", () => {
    const doc = parse(renderToStaticMarkup(<GuestSummary estimate={300} summary={{ invitationParties: 2, invited: 10, attending: 6, awaitingResponse: 3, notAttending: 1, notYetInvited: 2 }} />));
    expect(doc.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("60% attending: 6 of 10 invited guests");
    expect(doc.body.textContent).toContain("~300");
    expect(doc.body.textContent).toContain("2 not yet invited");
    expect(doc.querySelectorAll(".guest-summary-metric")).toHaveLength(4);
  });
  it("has a defined no-invitations state and no fabricated percentage", () => {
    const doc = parse(renderToStaticMarkup(<GuestSummary estimate={null} summary={{ invitationParties: 0, invited: 0, attending: 0, awaitingResponse: 0, notAttending: 0, notYetInvited: 0 }} />));
    expect(doc.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("No invited guests yet");
    expect(doc.querySelector('[role="img"]')?.textContent).not.toContain("%");
  });
  it("highlights only a received canonical change, never initial load, equivalent render or manual edit", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const animate = vi.fn<(frames: Keyframe[], options: KeyframeAnimationOptions) => { cancel: () => void }>(() => ({ cancel: vi.fn() }));
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    const render = (canonical: boolean, committedMinor: number | null) => act(() => root.render(<BudgetExpenseSurface canonical={canonical} committedMinor={committedMinor}>Expense</BudgetExpenseSurface>));
    await render(true, 10000); expect(animate).not.toHaveBeenCalled();
    await render(true, 10000); expect(animate).not.toHaveBeenCalled();
    await render(true, 12000); expect(animate).toHaveBeenCalledTimes(1); expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 1200 });
    await render(false, 13000); expect(animate).toHaveBeenCalledTimes(1);
    await act(() => root.unmount()); delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });
});
