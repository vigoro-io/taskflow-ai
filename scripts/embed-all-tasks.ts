import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { type Task } from "../src/types/tasks";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 20;

function taskToContent(task: Task): string {
  const parts = [task.title];
  if (task.description) parts.push(task.description);
  parts.push(`Prioridad: ${task.priority}`);
  parts.push(`Estado: ${task.status}`);
  return parts.join(". ");
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "voyage-3.5",
      input: texts,
      input_type: "document",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${error}`);
  }

  const json = (await response.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at");

  if (error) throw new Error(error.message);
  if (!tasks || tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  console.log(`Found ${tasks.length} tasks. Embedding in batches of ${BATCH_SIZE}...`);

  let processed = 0;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE) as Task[];
    const contents = batch.map(taskToContent);

    const embeddings = await embedBatch(contents);

    const taskIds = batch.map((task) => task.id);

    const { error: deleteError } = await supabase
      .from("task_embeddings")
      .delete()
      .in("task_id", taskIds);

    if (deleteError) throw new Error(deleteError.message);

    const rows = batch.map((task, j) => ({
      task_id: task.id,
      user_id: task.user_id,
      content: contents[j],
      embedding: JSON.stringify(embeddings[j]),
    }));

    const { error: insertError } = await supabase
      .from("task_embeddings")
      .insert(rows);

    if (insertError) throw new Error(insertError.message);

    processed += batch.length;
    console.log(`  ${processed}/${tasks.length} tareas procesadas`);
  }

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
