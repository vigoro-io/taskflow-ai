import { useMemo } from "react";
import { type Task } from "@/types/tasks";

export function useTasksByStatus(tasks: Task[]) {
  return useMemo(() => {
    const byStatus = (status: Task["status"]) =>
      tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

    return {
      todo: byStatus("todo"),
      in_progress: byStatus("in_progress"),
      done: byStatus("done"),
    };
  }, [tasks]);
}
