import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageContent } from "@/components/assistant/message-content";
import { AssistantChat } from "@/components/assistant/assistant-chat";

const parse = (text: string) => new DOMParser().parseFromString(renderToStaticMarkup(<MessageContent text={text} />), "text/html");
describe("Assistant safe editorial Markdown", () => {
  it("reuses the existing Couple photo when supplied", () => {
    const html = renderToStaticMarkup(<AssistantChat coupleAvatar={{ choice: "heart", photoUrl: "/fixture-couple.png" }} initialThreadId={null} initialMessages={[{ id: "fixture", role: "user", content: "Hello", source_labels: [], created_at: "2026-09-09" }]} />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector('[data-avatar-source="photo"] img')?.getAttribute("src")).toBe("/fixture-couple.png");
  });
  it("renders paragraphs, emphasis and semantic lists", () => {
    const doc = parse("**Important** advice.\n\nA *quiet* moment.\n\n- Photographer\n- DJ\n\n1. First\n2. Second");
    expect(doc.querySelector("strong")?.textContent).toBe("Important");
    expect(doc.querySelector("em")?.textContent).toBe("quiet");
    expect(doc.querySelectorAll("p")).toHaveLength(2);
    expect(doc.querySelectorAll("ul > li")).toHaveLength(2);
    expect(doc.querySelectorAll("ol > li")).toHaveLength(2);
    expect(doc.body.textContent).not.toContain("**");
  });
  it("never trusts HTML, images, scripts or unsafe links", () => {
    const doc = parse('<script>alert(1)</script>\n\n<iframe src="https://example.com"></iframe>\n\n<img src=x onerror=alert(1)>\n\n[unsafe](javascript:alert)\n\n![image](https://example.com/a.png)\n\n[safe](https://example.com)');
    expect(doc.querySelector("script, iframe, img, [onerror]")).toBeNull();
    expect(doc.querySelectorAll("a")).toHaveLength(1);
    expect(doc.querySelector("a")?.getAttribute("rel")).toBe("noopener noreferrer");
  });
  for (const [text, direction] of [["**שלום**\n\n- צלם\n- מוזיקה", "rtl"], ["**Hello**\n\n- Photographer", "ltr"]]) {
    for (const role of ["assistant", "user"] as const) it(`${role} ${direction} keeps language, role and semantic list`, () => {
      const html = renderToStaticMarkup(<AssistantChat initialThreadId={null} initialMessages={[{ id: "fixture", role, content: text, source_labels: [], created_at: "2026-09-09T10:00:00Z" }]} />);
      const doc = new DOMParser().parseFromString(html, "text/html");
      expect(doc.querySelector(`[data-role=${role}] .assistant-markdown`)?.getAttribute("dir")).toBe(direction);
      expect(doc.querySelector(".assistant-markdown ul")).not.toBeNull();
      expect(doc.querySelector(".assistant-sources")).toBeNull();
      expect(doc.querySelector(".assistant-composer-note")?.textContent).toBe(direction === "rtl" ? "התשובות יכולות להיעזר בפרטי החתונה, במשימות, בספקים ובתקציב שלכם." : "Answers can use your wedding profile, tasks, vendors, and budget.");
      expect(doc.querySelector(".assistant-ready")?.textContent).toBe(direction === "rtl" ? "כאן לעזור" : "Ready to help");
      expect(html).not.toContain("provider health");
      expect(role === "user" ? doc.querySelector("[data-avatar-source=icon]") : doc.querySelector(".assistant-avatar")).not.toBeNull();
    });
  }
});
