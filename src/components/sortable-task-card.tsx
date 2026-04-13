"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Task } from "@/types/tasks";
import { TaskCard } from "@/components/task-card";

type SortableTaskCardProps = {
  task: Task;
};

export function SortableTaskCard({ task }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}
