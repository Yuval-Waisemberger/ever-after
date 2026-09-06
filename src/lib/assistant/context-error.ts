import type { ContextSection } from "./evidence";
export class AssistantContextUnavailableError extends Error {
  constructor(readonly section: ContextSection) {
    super(`Assistant context unavailable: ${section}`);
    this.name = "AssistantContextUnavailableError";
  }
}
export async function readAssistantSection<T>(section: ContextSection, read: () => PromiseLike<T>): Promise<T> {
  try { return await read(); } catch { throw new AssistantContextUnavailableError(section); }
}
