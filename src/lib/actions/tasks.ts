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
  revalidatePath("/assistant");
}

export async function saveTask(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the task fields below.", errors: parsed.error.flatten().fieldErrors };
  }

  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const values = {
    wedding_id: wedding.id,
    title: parsed.data.title,
    notes: parsed.data.notes,
    category: parsed.data.category ?? (parsed.data.id ? null : "Other"),
    due_date: parsed.data.dueDate,
    priority: parsed.data.priority,
    status: parsed.data.status,
  };

  const result = parsed.data.id
    ? await supabase.from("tasks").update(values).eq("id", parsed.data.id).eq("wedding_id", wedding.id).select("id").maybeSingle()
    : await supabase.from("tasks").insert(values).select("id").single();

  if (result.error || !result.data) {
    return { status: "error", message: "The task could not be saved. Please try again." };
  }
  refreshTaskViews();
  return { status: "success", message: parsed.data.id ? "Task updated." : "Task created." };
}

export async function changeTaskStatus(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = taskStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", message: "This task action is invalid. Refresh the page and try again." };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const result = await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("wedding_id", wedding.id).select("id").maybeSingle();
  if (result.error || !result.data) return { status: "error", message: "The task could not be changed. Refresh and try again." };
  refreshTaskViews();
  return { status: "success", message: "Task updated." };
}

export async function deleteTask(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = taskIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", message: "This task action is invalid. Refresh the page and try again." };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const result = await supabase.from("tasks").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id).select("id").maybeSingle();
  if (result.error || !result.data) return { status: "error", message: "The task could not be changed. Refresh and try again." };
  refreshTaskViews();
  return { status: "success", message: "Task updated." };
}
