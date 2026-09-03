import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";

export async function getTasks() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, notes, category, due_date, priority, status, created_at")
    .eq("wedding_id", wedding.id)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Tasks could not be loaded.");
  return data ?? [];
}
