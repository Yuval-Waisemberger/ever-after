import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantChat } from "@/components/assistant/assistant-chat";

const threadId = "10000000-0000-4000-8000-000000000001";
let container: HTMLDivElement, root: Root;
const fetchMock = vi.fn();
const reply = () => new Response(JSON.stringify({ threadId, message: { id: crypto.randomUUID(), role: "assistant", content: "Your wedding summary", source_labels: ["Couple data"], created_at: "2026-09-08" } }), { status: 200 });
const failed = () => new Response(JSON.stringify({ threadId, errorCode: "MESSAGE_NOT_SAVED" }), { status: 500 });
const bodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
const button = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent?.includes(text))!;
async function submitSuggestion() {
  await act(async () => { (container.querySelector(".assistant-suggestions button") as HTMLButtonElement).click(); });
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<AssistantChat initialThreadId={null} initialMessages={[]} />); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Assistant logical request transport", () => {
  it("keeps the UUID through repeated explicit safe retries, using the server-created thread", async () => {
    fetchMock.mockResolvedValueOnce(failed()).mockResolvedValueOnce(failed()).mockResolvedValueOnce(reply());
    await submitSuggestion();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-role="user"]')).toHaveLength(0);
    await act(async () => { button("Try again").click(); });
    await act(async () => { button("Try again").click(); });
    const [first, second, third] = bodies();
    expect(first.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toEqual({ ...first, threadId }); expect(third).toEqual(second);
    expect(container.querySelectorAll('[data-role="user"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-role="assistant"]')).toHaveLength(1);
    expect(container.querySelector("textarea")!.value).toBe("");
    expect(container.textContent).not.toContain(first.requestId);
    expect(first).not.toHaveProperty("digest"); expect(first).not.toHaveProperty("coupleId");
  });
  it("assigns a new UUID to a genuinely new chat/message, even with identical question text", async () => {
    fetchMock.mockImplementation(async () => reply());
    await submitSuggestion();
    await act(async () => { button("New chat").click(); });
    await submitSuggestion();
    const [first, second] = bodies();
    expect(first.message).toBe(second.message); expect(first.requestId).not.toBe(second.requestId);
    expect(first.threadId).toBeNull(); expect(second.threadId).toBeNull();
  });
  it("does not clear pending input or dispatch twice, and never automatically retries ambiguity", async () => {
    let reject!: (reason: Error) => void;
    fetchMock.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    await submitSuggestion();
    expect(container.querySelector("textarea")!.value).toBe(bodies()[0].message);
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { reject(new Error("Network reply lost")); });
    expect(button("Try again")).toBeUndefined(); expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
