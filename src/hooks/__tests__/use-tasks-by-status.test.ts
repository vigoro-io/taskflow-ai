import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTasksByStatus } from "../use-tasks-by-status";
import type { Task } from "@/types/tasks";

describe("useTasksByStatus", () => {
  const mockTasks: Task[] = [
    {
      id: "task-1",
      user_id: "user-123",
      title: "Tarea TODO 1",
      description: "Primera tarea",
      priority: "high",
      status: "todo",
      position: 2,
      due_date: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "task-2",
      user_id: "user-123",
      title: "Tarea TODO 2",
      description: "Segunda tarea",
      priority: "medium",
      status: "todo",
      position: 1,
      due_date: null,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
    {
      id: "task-3",
      user_id: "user-123",
      title: "Tarea en progreso",
      description: null,
      priority: "low",
      status: "in_progress",
      position: 1,
      due_date: null,
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
    },
    {
      id: "task-4",
      user_id: "user-123",
      title: "Tarea completada",
      description: "Tarea finalizada",
      priority: "critical",
      status: "done",
      position: 1,
      due_date: null,
      created_at: "2024-01-04T00:00:00Z",
      updated_at: "2024-01-04T00:00:00Z",
    },
  ];

  it("agrupa las tareas correctamente por estado", () => {
    const { result } = renderHook(() => useTasksByStatus(mockTasks));

    expect(result.current.todo).toHaveLength(2);
    expect(result.current.in_progress).toHaveLength(1);
    expect(result.current.done).toHaveLength(1);
  });

  it("ordena las tareas por position en cada columna", () => {
    const { result } = renderHook(() => useTasksByStatus(mockTasks));

    // Las tareas TODO deberían estar ordenadas por position (1, 2)
    expect(result.current.todo[0].position).toBe(1);
    expect(result.current.todo[0].id).toBe("task-2");
    expect(result.current.todo[1].position).toBe(2);
    expect(result.current.todo[1].id).toBe("task-1");
  });

  it("maneja arrays vacíos correctamente", () => {
    const { result } = renderHook(() => useTasksByStatus([]));

    expect(result.current.todo).toEqual([]);
    expect(result.current.in_progress).toEqual([]);
    expect(result.current.done).toEqual([]);
  });

  it("usa memoización - devuelve la misma referencia si las tareas no cambian", () => {
    const { result, rerender } = renderHook(
      ({ tasks }) => useTasksByStatus(tasks),
      {
        initialProps: { tasks: mockTasks },
      }
    );

    const firstResult = result.current;

    // Re-renderizar con las mismas tareas
    rerender({ tasks: mockTasks });

    const secondResult = result.current;

    // Debería ser la misma referencia (memoización)
    expect(firstResult).toBe(secondResult);
  });

  it("actualiza cuando las tareas cambian", () => {
    const { result, rerender } = renderHook(
      ({ tasks }) => useTasksByStatus(tasks),
      {
        initialProps: { tasks: mockTasks },
      }
    );

    const firstTodoCount = result.current.todo.length;
    expect(firstTodoCount).toBe(2);

    // Cambiar las tareas
    const newTasks = mockTasks.filter((t) => t.status !== "todo");
    rerender({ tasks: newTasks });

    expect(result.current.todo).toHaveLength(0);
    expect(result.current.in_progress).toHaveLength(1);
    expect(result.current.done).toHaveLength(1);
  });

  it("filtra correctamente cada estado", () => {
    const { result } = renderHook(() => useTasksByStatus(mockTasks));

    // Verificar que cada columna solo tiene tareas del estado correcto
    result.current.todo.forEach((task) => {
      expect(task.status).toBe("todo");
    });

    result.current.in_progress.forEach((task) => {
      expect(task.status).toBe("in_progress");
    });

    result.current.done.forEach((task) => {
      expect(task.status).toBe("done");
    });
  });
});
