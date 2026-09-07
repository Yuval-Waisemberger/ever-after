"use client";
import { createContext, useContext, useState } from "react";
import type { WeddingFieldValues } from "./wedding-fields";
type Draft = Record<string, string | string[]>;
const Context = createContext<{ values: Draft; set: (name: string, value: string | string[]) => void } | null>(null);
export function WeddingDraft({ values, names = {}, children }: { values: WeddingFieldValues; names?: Record<string, string>; children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => ({ weddingDate: values.weddingDate ?? "", guestCount: values.guestCount == null ? "" : String(values.guestCount),
    preferredArea: values.preferredArea ?? "", eventType: values.eventType ?? "", styles: values.styles ?? [], priorities: values.priorities ?? [],
    totalBudgetShekels: values.totalBudgetMinor == null ? "" : String(values.totalBudgetMinor / 100), ...names }));
  return <Context.Provider value={{ values: draft, set: (name, value) => setDraft(d => ({ ...d, [name]: value })) }}>{children}</Context.Provider>;
}
export const useWeddingDraft = () => useContext(Context);
