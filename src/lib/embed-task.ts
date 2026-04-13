import { createClient } from "@/lib/supabase/server";
import { embedDocuments } from "@/lib/embeddings";
import { type Task } from "@/types/tasks";

export function taskToContent(task: Task): string {
  const parts = [task.title];
  if (task.description) parts.push(task.description);
  parts.push(`Prioridad: ${task.priority}`);
  parts.push(`Estado: ${task.status}`);
  return parts.join(". ");
}

export async function embedTask(task: Task): Promise<void> {
  const supabase = await createClient();
  const content = taskToContent(task);
  const [embedding] = await embedDocuments([content]);

  const { error: deleteError } = await supabase
    .from("task_embeddings")
    .delete()
    .eq("task_id", task.id);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("task_embeddings").insert({
    task_id: task.id,
    user_id: task.user_id,
    content,
    embedding: JSON.stringify(embedding),
  });

  if (insertError) throw new Error(insertError.message);
}
