import { describe, expect, it } from "vitest";
import { assistantCopy, selectResponseLanguage, sourceDisplayLabel } from "@/lib/assistant/language";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";
import { runWeddingAgent } from "@/lib/assistant/agent";
import { AssistantContextUnavailableError } from "@/lib/assistant/context-error";
import { assistantContext, assistantVendor } from "./fixtures";
import { readFileSync } from "node:fs";

describe("provider-independent language selection", () => {
  it.each([["מה המשימות שלי השבוע?", "he"], ["What tasks are due this week?", "en"], ["מה ה-budget שנשאר לנו?", "he"], ["Answer in English: מה התקציב?", "en"], ["Please reply in Hebrew. What is our budget?", "he"], ["תענה באנגלית על המשימות שלי", "en"]])("selects %s → %s", (message, language) => expect(selectResponseLanguage(message).language).toBe(language));
  it("uses recent language for ambiguous mixed or numeric messages and a manual override", () => {
    expect(selectResponseLanguage("Can you compare את הצלמים ששמרתי?", "he")).toMatchObject({ language: "he", basis: "recent" });
    expect(selectResponseLanguage("2000 ₪?", "en").language).toBe("en");
    expect(selectResponseLanguage("123", "he").language).toBe("he");
    expect(selectResponseLanguage("What is our budget?", "en", "he").language).toBe("he");
    expect(selectResponseLanguage("Answer in English", "he", "he").language).toBe("en");
  });
});
describe("small bilingual Local behavior", () => {
  const provider = new LocalWeddingAssistantProvider();
  it.each([["מה המשימות שלי השבוע?", "משימות", "tasks"], ["כמה תקציב נשאר לנו?", "תקציב", "budget"], ["כמה מוזמנים לא ענו?", "השיבו", "guestList"], ["אילו ספקים סגרנו?", "ספק", "vendors"]])("answers %s with real Hebrew summaries", async (message, phrase, section) => {
    const result = await runWeddingAgent({ message, provider, loadContext: async () => assistantContext() });
    expect(result.language).toBe("he"); expect(result.text).toContain(phrase); expect(result.evidence).toContainEqual({ kind: "COUPLE_DATA", section });
  });
  it("preserves proper business names", async () => {
    const context = assistantContext(); context.vendors = [assistantVendor({ businessName: "Maya Photography", lifecycleStatus: "booked" })];
    expect((await provider.respond({ message: "אילו ספקים סגרנו?", context })).text).toContain("Maya Photography");
  });
  it("keeps English behavior and allows an explicit English answer to Hebrew input", async () => {
    const result = await runWeddingAgent({ message: "מה המשימות?", requestedLanguage: "en", provider, loadContext: async () => assistantContext() });
    expect(result.language).toBe("en"); expect(result.text).toContain("open");
  });
  it("redirects Hebrew diagnosis and politics before context loading", async () => {
    for (const message of ["אבחן פריחה לפני החתונה", "למי להצביע בבחירות?"]) {
      const result = await runWeddingAgent({ message, provider, loadContext: async () => { throw new Error("must_not_load"); } });
      expect(result.status).toBe("out_of_scope"); expect(result.text).toBe(assistantCopy.he.redirect);
    }
  });
  it.each(["budget", "guestList", "vendors"] as const)("keeps unavailable %s Hebrew, never zero or technical details", async (section) => {
    const result = await runWeddingAgent({ message: "מה התקציב שלנו?", provider, loadContext: async () => { throw new AssistantContextUnavailableError(section); } });
    expect(result.text).toContain("לא הצלחתי לגשת"); expect(result.status).toBe("unavailable"); expect(result.evidence).toEqual([]); expect(result.text).not.toContain("0");
  });
  it("keeps market claims unavailable and supplies only a clarification contract without quote extraction", async () => {
    const result = await runWeddingAgent({ message: "הצלם הציע לנו 2,000 ₪, זה מחיר טוב?", provider, loadContext: async () => assistantContext() });
    expect(result.error?.code).toBe("RESEARCH_UNAVAILABLE"); expect(result.text).toContain("איני יכול לאמת");
    expect(result.clarificationIntent?.missingFields.map((item) => item.field)).toContain("coverageHours");
    expect(result.evidence).toEqual([]); expect(result.actionProposal).toBeUndefined();
  });
  it("keeps source labels localized and ignores unknown labels", () => {
    expect(sourceDisplayLabel("Couple data", "he")).toBe("נתוני החתונה");
    expect(sourceDisplayLabel("Internal vendor database", "he")).toBe("Ever After Marketplace");
    expect(sourceDisplayLabel("SQL_EXCEPTION", "he")).toBeNull();
  });
  it("uses no external detection or language SDK", () => {
    expect(readFileSync("src/lib/assistant/language.ts", "utf8")).not.toMatch(/fetch\(|https?:\/\/|openai|anthropic/);
  });
});
