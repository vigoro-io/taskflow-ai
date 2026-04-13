import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Task, PRIORITY_CONFIG } from "@/types/tasks";

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
};

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className={cn(
        "bg-white/5 border border-white/5 rounded-lg p-4 cursor-grab active:cursor-grabbing transition-colors hover:border-white/20",
        isDragging && "opacity-50 rotate-2 shadow-xl scale-105"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {task.status === "done" && (
              <Check className="size-4 shrink-0 text-green-400" />
            )}
            <span className="text-sm font-medium text-white truncate">
              {task.title}
            </span>
          </div>
          <span
            className={cn(
              "inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold",
              priority.className
            )}
          >
            {priority.label}
          </span>
          {task.description && (
            <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <GripVertical className="size-4 shrink-0 text-neutral-500" />
      </div>
    </div>
  );
}
