import type { AssistantMessage } from "./assistant-chat";

export type ConversationSummary = { id: string; title: string };
export type HistoryPage = { threads: ConversationSummary[]; hasMore: boolean };
export type MessagePage = { messages: AssistantMessage[]; hasMore: boolean };
export type HistoryReader = (offset: number) => Promise<HistoryPage | null>;
export type ConversationReader = (id: string, offset: number) => Promise<MessagePage | null>;

// Explicit display whitelist. Never pass the full wedding, notes or tool context to the client.
export function weddingContextChips(wedding: {
  styles?: string[] | null; preferred_area?: string | null; guest_count?: number | null;
  total_budget_minor?: number | string | null; priorities?: string[] | null;
}) {
  const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const chips: string[] = [];
  if (wedding.styles?.length) chips.push(wedding.styles.slice(0, 2).map(label).join(" · "));
  if (wedding.preferred_area) chips.push(label(wedding.preferred_area));
  if (wedding.guest_count != null) chips.push(`${wedding.guest_count.toLocaleString("en-IL")} guests`);
  if (wedding.total_budget_minor != null && Number.isFinite(Number(wedding.total_budget_minor))) chips.push(`${new Intl.NumberFormat("en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(wedding.total_budget_minor) / 100)} budget`);
  if (wedding.priorities?.length) chips.push(`${label(wedding.priorities[0])} priority`);
  return chips;
}
