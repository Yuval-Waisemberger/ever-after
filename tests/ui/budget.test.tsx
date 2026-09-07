import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetItemForm } from "@/components/budget/budget-forms";
import { BudgetBookingNotice } from "@/components/budget/booking-notice";
import { calculateBudgetSummary } from "@/lib/domain/budget";

vi.mock("@/lib/actions/budget", () => ({ saveBudgetItem: vi.fn(), savePayment: vi.fn(), setTotalBudget: vi.fn(), deleteBudgetItem: vi.fn(), deletePayment: vi.fn(), togglePaymentPaid: vi.fn() }));
vi.mock("@/lib/queries/budget", () => ({ getBudgetPageData: async () => ({
  wedding: { total_budget_minor: 17000 },
  summary: calculateBudgetSummary(17000, [{ committedAmountMinor: null, payments: [{ amountMinor: 2000, isPaid: true }] }]),
  items: [{ id: "expense", source: "booked_vendor", couple_vendor_id: "relationship", label: "External Studio", category: "Photography", estimated_amount_minor: 10000, committed_amount_minor: null, notes: "", couple_vendors: { status: "rejected", external_vendors: { business_name: "External Studio" }, vendor_profiles: null }, payments: [
    { id: "paid", label: "Deposit", amount_minor: 2000, is_paid: true, due_date: null, notes: "" },
    { id: "unpaid", label: "Final installment", amount_minor: 8000, is_paid: false, due_date: "2027-01-01", notes: "" },
  ] }],
}) }));
import BudgetPage from "@/app/(couple)/budget/page";
const parse = (text: string) => new DOMParser().parseFromString(text, "text/html");

describe("Budget canonical item presentation", () => {
  it("keeps canonical link/source/commitment out of editable form data, including after unbooking", () => {
    const doc = parse(renderToStaticMarkup(<BudgetItemForm initial={{ id: "item", source: "booked_vendor", coupleVendorId: "relationship", estimatedMinor: 15000, committedMinor: null }} />));
    for (const name of ["source", "coupleVendorId", "committedShekels"]) expect(doc.querySelector(`[name="${name}"]`)).toBeNull();
    expect(doc.querySelector<HTMLInputElement>('[name="estimatedShekels"]')?.value).toBe("150");
    expect(doc.querySelector('a[href="/vendors/my"]')).not.toBeNull();
  });
  it("retains independent manual expenses without a duplicate-vendor selector", () => {
    const doc = parse(renderToStaticMarkup(<BudgetItemForm />));
    expect(doc.querySelector('[name="committedShekels"]')).not.toBeNull();
    expect(doc.querySelector('[name="coupleVendorId"]')).toBeNull();
    expect(doc.body.textContent).toContain("Manual expenses are independent");
  });
  it("preserves external business names and explains inactive schedules and spent money", () => {
    const doc = parse(renderToStaticMarkup(<BudgetBookingNotice vendorName="External Studio" item={{ source: "booked_vendor", relationshipStatus: "rejected", committedAmountMinor: null, payments: [{ amountMinor: 20, isPaid: true }, { amountMinor: 80, isPaid: false }] }} />));
    expect(doc.querySelector("bdi")?.textContent).toBe("External Studio");
    expect(doc.body.textContent).toContain("not upcoming obligations");
    expect(doc.body.textContent).toContain("Recorded payments still reduce available funds");
    expect(doc.querySelector('[role="status"]')?.textContent).toContain("recorded payments exceed");
  });
  it("shows scheduled-over-commitment warning without requiring overpayment", () => {
    const doc = parse(renderToStaticMarkup(<BudgetBookingNotice item={{ committedAmountMinor: 10, payments: [{ amountMinor: 12, isPaid: false }] }} />));
    expect(doc.body.textContent).toContain("payment schedule exceeds");
    expect(doc.body.textContent).not.toContain("recorded payments exceed");
  });
  it("renders the real Budget page with inactive history, safe errors and no canonical delete/add-payment control", async () => {
    const page = await BudgetPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ error: "history" }) });
    const doc = parse(renderToStaticMarkup(page));
    expect(doc.body.textContent).toContain("Inactive schedule");
    expect(doc.body.textContent).toContain("Deposit");
    expect(doc.body.textContent).not.toContain("Delete expense and its payments");
    expect([...doc.querySelectorAll("button")].some(b => b.textContent === "Delete expense")).toBe(false);
    expect([...doc.querySelectorAll("summary")].some(b => b.textContent === "Add payment")).toBe(false);
    expect(doc.querySelector('[role="alert"]')?.textContent).toContain("protected financial history");
  });
});
