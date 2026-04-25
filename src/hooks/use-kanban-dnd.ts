"use client";

import { useState } from "react";
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type Task, type TaskStatus } from "@/types/tasks";

const VALID_STATUSES = ["todo", "in_progress", "done"] as const;

export function useKanbanDnd(
  tasks: Task[],
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const overId = String(over.id);

    const newStatus: TaskStatus = VALID_STATUSES.includes(
      overId as TaskStatus
    )
      ? (overId as TaskStatus)
      : (tasks.find((t) => t.id === overId)?.status ?? task.status);

    if (task.status === newStatus) return;

    await moveTask(task.id, newStatus);
  }

  return { sensors, activeTask, handleDragStart, handleDragEnd };
}
