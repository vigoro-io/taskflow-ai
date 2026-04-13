"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Task, type TaskStatus } from "@/types/tasks";

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("position");

  if (error) throw new Error(error.message);

  return data ?? [];
}
