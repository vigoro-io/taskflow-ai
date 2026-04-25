"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Task, type TaskStatus, type TaskPriority } from "@/types/tasks";
import { embedTask } from "@/lib/embed-task";

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

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");

  // Obtener la posición máxima actual para el usuario
  const { data: maxPositionData } = await supabase
    .from("tasks")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = maxPositionData?.[0]?.position
    ? maxPositionData[0].position + 1
    : 0;

  // Crear la tarea
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description || null,
      priority: input.priority || "medium",
      status: "todo",
      position: nextPosition,
      due_date: input.due_date || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Generar embedding para la tarea
  try {
    await embedTask(data);
  } catch (embedError) {
    console.error("Error generando embedding:", embedError);
    // No lanzar error, solo log - la tarea se creó correctamente
  }

  revalidatePath("/dashboard");
  return data;
}
