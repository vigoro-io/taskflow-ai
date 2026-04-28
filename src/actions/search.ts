"use server";

import { createClient } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/embeddings";
import { extractStatusFromQuery } from "@/lib/query-normalizer";
import { type Task } from "@/types/tasks";

export type SearchResult = {
  task_id: string;
  content: string;
  similarity: number;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Traducciones de status
const STATUS_LABELS: Record<Task["status"], string> = {
  "todo": "por hacer",
  "in_progress": "en progreso",
  "done": "terminado",
};

// Traducciones de prioridad
const PRIORITY_LABELS: Record<Task["priority"], string> = {
  "low": "baja",
  "medium": "media",
  "high": "alta",
  "critical": "crítica",
};

/**
 * Obtiene la etiqueta de estado en español
 */
function getStatusLabel(status: Task["status"]): string {
  return STATUS_LABELS[status];
}

/**
 * Obtiene la etiqueta de prioridad en español
 */
function getPriorityLabel(priority: Task["priority"]): string {
  return PRIORITY_LABELS[priority];
}

/**
 * Formatea el contenido de una tarea para mostrar en el chat
 */
function formatTaskContent(task: Task): string {
  const parts: string[] = [];

  // Título (requerido)
  parts.push(`${task.title}.`);

  // Descripción (opcional)
  if (task.description) {
    parts.push(`${task.description}.`);
  }

  // Prioridad y estado
  parts.push(`Prioridad: ${getPriorityLabel(task.priority)}.`);
  parts.push(`Estado: ${getStatusLabel(task.status)}`);

  // Fecha de vencimiento (opcional)
  if (task.due_date) {
    const date = new Date(task.due_date).toLocaleDateString("es-ES");
    parts.push(`Vence: ${date}`);
  }

  return parts.join(" ");
}

/**
 * Busca tareas por estado
 * Responsabilidad: ejecutar búsqueda en BD por estado mencionado
 */
async function searchByStatus(
  supabase: SupabaseClient,
  statuses: string[],
  matchCount: number
): Promise<SearchResult[]> {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(matchCount);

  if (error) throw new Error(error.message);

  return (tasks ?? []).map((task: Task) => ({
    task_id: task.id,
    content: formatTaskContent(task),
    similarity: 1.0, // Coincidencia directa por estado
  }));
}

/**
 * Busca tareas por semántica (vector embeddings)
 * Responsabilidad: ejecutar búsqueda semántica via RPC
 */
async function searchBySemantics(
  supabase: SupabaseClient,
  query: string,
  matchThreshold: number,
  matchCount: number
): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_task_embeddings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) throw new Error(error.message);

  return (data ?? []) as SearchResult[];
}

/**
 * Busca tareas combinando búsqueda por estado y búsqueda semántica
 * Responsabilidad: orquestar estrategia de búsqueda
 */
export async function searchTasks(
  query: string,
  matchThreshold = 0.5,
  matchCount = 10
): Promise<SearchResult[]> {
  const supabase = await createClient();

  // Extraer estados mencionados en la consulta
  const mentionedStatuses = extractStatusFromQuery(query);

  // Si se mencionan estados específicos, buscar directamente en la BD
  if (mentionedStatuses.length > 0) {
    return searchByStatus(supabase, mentionedStatuses, matchCount);
  }

  // Si no hay estados mencionados, usar búsqueda semántica
  return searchBySemantics(supabase, query, matchThreshold, matchCount);
}
