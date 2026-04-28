"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Task, type TaskStatus, type TaskPriority } from "@/types/tasks";
import { embedTask } from "@/lib/embed-task";

// Type alias para SupabaseClient
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Obtiene el usuario autenticado o lanza error
 */
async function requireAuthUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");

  return user;
}

/**
 * Obtiene la siguiente posición para una nueva tarea
 */
async function getNextPosition(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("tasks")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1);

  return (data?.[0]?.position ?? -1) + 1;
}

/**
 * Genera embedding para una tarea
 * Responsabilidad única: generar embeddings
 */
export async function generateTaskEmbedding(task: Task): Promise<void> {
  try {
    await embedTask(task);
  } catch (embedError) {
    console.error("Error generando embedding:", embedError);
    // No relanzar error - el embedding es secundario a la tarea
  }
}

/**
 * Actualiza el estado de una tarea existente
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<void> {
  const supabase = await createClient();

  const user = await requireAuthUser(supabase);

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

/**
 * Obtiene todas las tareas del usuario autenticado
 */
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

/**
 * Input para crear una nueva tarea
 */
export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
};

/**
 * Crea una nueva tarea
 * Responsabilidad única: crear la tarea en la BD
 * El embedding se genera de forma asincrónica en background
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const supabase = await createClient();

  const user = await requireAuthUser(supabase);

  const nextPosition = await getNextPosition(supabase, user.id);

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

  // Generar embedding de forma asincrónica sin bloquear la respuesta
  generateTaskEmbedding(data).catch((err) => {
    console.error("Background embedding generation failed:", err);
  });

  revalidatePath("/dashboard");
  return data;
}
