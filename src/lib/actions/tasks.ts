"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { formObject, type ActionState } from "./state";
import { taskIdSchema, taskSchema, taskStatusSchema } from "@/lib/validation/task";

function refreshTaskViews() {
  revalidatePath("/tasks");
  revalidatePath("/wedding");
  revalidatePath("/wedding/timeline");
}

export async function saveTask(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const values = {
    wedding_id: wedding.id,
    title: parsed.data.title,
    notes: parsed.data.notes,
    category: parsed.data.category,
    due_date: parsed.data.dueDate,
    priority: parsed.data.priority,
    status: parsed.data.status,
  };

  const result = parsed.data.id
    ? await supabase.from("tasks").update(values).eq("id", parsed.data.id).eq("wedding_id", wedding.id)
    : await supabase.from("tasks").insert(values);

  if (result.error) {
    return { status: "error", message: "The task could not be saved. Please try again." };
  }
  refreshTaskViews();
  return { status: "success", message: parsed.data.id ? "Task updated." : "Task created." };
}

export async function changeTaskStatus(formData: FormData) {
  const parsed = taskStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("wedding_id", wedding.id);
  refreshTaskViews();
}

export async function deleteTask(formData: FormData) {
  const parsed = taskIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id);
  refreshTaskViews();
}
