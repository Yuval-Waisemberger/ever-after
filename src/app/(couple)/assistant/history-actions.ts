"use server";

import { z } from "zod";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { createClient } from "@/lib/supabase/server";
import type { HistoryPage, MessagePage } from "@/components/assistant/presentation";

const offsetSchema = z.number().int().min(0).max(100000);

// Presentation-only readers: existing role guard + owned wedding + RLS. No writes or Agent tools.
export async function readAssistantHistory(offset = 0): Promise<HistoryPage | null> {
  if (!offsetSchema.safeParse(offset).success) return null;
  try {
    const wedding = await getOwnedWedding();
    const supabase = await createClient();
    const { data, error } = await supabase.from("assistant_threads").select("id, title")
      .eq("wedding_id", wedding.id).order("updated_at", { ascending: false }).order("id")
      .range(offset, offset + 30);
    if (error || !data) return null;
    return { threads: data.slice(0, 30), hasMore: data.length > 30 };
  } catch { return null; }
}

export async function readAssistantConversation(id: string, offset = 0): Promise<MessagePage | null> {
  if (!z.uuid().safeParse(id).success || !offsetSchema.safeParse(offset).success) return null;
  try {
    const wedding = await getOwnedWedding();
    const supabase = await createClient();
    const { data: thread, error: threadError } = await supabase.from("assistant_threads").select("id")
      .eq("id", id).eq("wedding_id", wedding.id).maybeSingle();
    if (threadError || !thread) return null;
    const { data, error } = await supabase.from("assistant_messages").select("id, role, content, source_labels, created_at")
      .eq("thread_id", thread.id).order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + 50);
    if (error || !data) return null;
    return { messages: data.slice(0, 50).reverse(), hasMore: data.length > 50 } as MessagePage;
  } catch { return null; }
}
