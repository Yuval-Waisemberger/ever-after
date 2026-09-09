import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantChat, type AssistantMessage } from "@/components/assistant/assistant-chat";
import { Clarification, MessageContent } from "@/components/assistant/message-content";
const message: AssistantMessage = { id: "1", role: "assistant", content: "נשארו 2,000 ₪ עבור Maya Photography.\nYour next payment is 2026-09-12.", source_labels: ["Couple data", "Internal vendor database", "General guidance"], created_at: "2026-09-07" };
describe("Assistant bilingual presentation", () => {
  it("uses explicit Hebrew direction for the message", () => {
    const html = renderToStaticMarkup(<MessageContent text={message.content} />);
    expect(html).toContain('dir="rtl"'); expect(html).toContain('lang="he"');
    expect(html).toContain("Maya Photography");
  });
  it("keeps role alignment, auto-direction composer and readable source lists", () => {
    const html = renderToStaticMarkup(<AssistantChat initialThreadId={null} initialMessages={[message]} />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("textarea")?.getAttribute("dir")).toBe("auto");
    expect(doc.querySelector('[data-role="assistant"]')?.className).toContain("justify-start");
    expect(doc.querySelector("select")?.getAttribute("aria-label")).toBeTruthy();
    expect(html).toContain("Ever After Marketplace"); expect(html).not.toContain("Web research");
  });
  it("renders the structured clarification in Hebrew without debug field names", () => {
    const html = renderToStaticMarkup(<Clarification language="he" intent={{ required: true, missingFields: [{ field: "coverageHours", questionIntent: "define_package", reason: "package_comparability" }] }} />);
    expect(html).toContain("כמה שעות צילום כלולות?"); expect(html).not.toContain("coverageHours");
  });
  it("fails closed on unavailable history and disables sending", () => {
    const html = renderToStaticMarkup(<AssistantChat initialThreadId={null} initialMessages={[]} initialLoadError />);
    expect(html).toContain('role="alert"'); expect(html).not.toContain("stack"); expect(html).toContain("disabled");
  });
});
