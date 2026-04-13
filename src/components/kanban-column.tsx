"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { type Task, type TaskStatus } from "@/types/tasks";
import { SortableTaskCard } from "@/components/sortable-task-card";

type KanbanColumnProps = {
  id: TaskStatus;
  label: string;
  tasks: Task[];
};

export function KanbanColumn({ id, label, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border p-4 min-h-96 shadow-sm transition-colors duration-200",
        isOver
          ? "border-blue-500/50 bg-blue-500/5"
          : "border-white/10 bg-white/5"
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="text-white font-semibold">{label}</h2>
        <span className="text-xs text-neutral-300 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {tasks.length === 0 && (
        <p className="text-center text-neutral-500 text-sm mt-8">
          Suelta aquí
        </p>
      )}
    </div>
  );
}
