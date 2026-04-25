import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTasks, updateTaskStatus } from "../tasks";
import type { Task } from "@/types/tasks";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("Server Actions - Tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTasks", () => {
    it("devuelve tareas para usuario autenticado", async () => {
      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockTasks: Task[] = [
        {
          id: "task-1",
          user_id: "user-123",
          title: "Tarea 1",
          description: "Descripción 1",
          priority: "high",
          status: "todo",
          position: 1,
          due_date: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "task-2",
          user_id: "user-123",
          title: "Tarea 2",
          description: null,
          priority: "medium",
          status: "in_progress",
          position: 2,
          due_date: null,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const result = await getTasks();

      expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockOrder).toHaveBeenCalledWith("position");
      expect(result).toEqual(mockTasks);
    });

    it("devuelve array vacío para usuario no autenticado", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getTasks();

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("lanza error cuando falla la consulta de Supabase", async () => {
      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockError = { message: "Database error" };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      await expect(getTasks()).rejects.toThrow("Database error");
    });
  });

  describe("updateTaskStatus", () => {
    it("actualiza el estado de la tarea correctamente", async () => {
      const taskId = "task-123";
      const newStatus = "done" as const;

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await updateTaskStatus(taskId, newStatus);

      expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: newStatus,
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith("id", taskId);

      const { revalidatePath } = await import("next/cache");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("lanza error cuando falla la actualización", async () => {
      const taskId = "task-123";
      const newStatus = "done" as const;
      const mockError = { message: "Update failed" };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      await expect(updateTaskStatus(taskId, newStatus)).rejects.toThrow(
        "Update failed"
      );
    });
  });
});
