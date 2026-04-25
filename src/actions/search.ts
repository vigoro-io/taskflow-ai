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

/**
 * Busca tareas combinando búsqueda semántica y búsqueda por estado
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
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .in("status", mentionedStatuses)
      .order("created_at", { ascending: false })
      .limit(matchCount);

    if (error) throw new Error(error.message);

    // Formatear como SearchResult
    return (tasks ?? []).map((task: Task) => ({
      task_id: task.id,
      content: formatTaskContent(task),
      similarity: 1.0, // Coincidencia directa por estado
    }));
  }

  // Si no hay estados mencionados, usar búsqueda semántica
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
 * Formatea el contenido de una tarea para mostrar en el chat
 */
function formatTaskContent(task: Task): string {
  const statusLabel = task.status === "todo" ? "por hacer" :
                      task.status === "in_progress" ? "en progreso" :
                      "terminado";

  const priorityLabel = task.priority === "low" ? "baja" :
                        task.priority === "medium" ? "media" :
                        task.priority === "high" ? "alta" :
                        "crítica";

  let content = `${task.title}.`;

  if (task.description) {
    content += ` ${task.description}.`;
  }

  content += ` Prioridad: ${priorityLabel}. Estado: ${statusLabel}`;

  if (task.due_date) {
    const date = new Date(task.due_date).toLocaleDateString("es-ES");
    content += `. Vence: ${date}`;
  }

  return content;
}
