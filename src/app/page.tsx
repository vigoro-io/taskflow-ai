import { KanbanBoardStatic } from "@/components/kanban-board-static";
import { type Task } from "@/types/tasks";

const mockTasks: Task[] = [
  { id: "1", user_id: "1", title: "Diseñar base de datos", description: "Schema con RLS", priority: "high", status: "done", position: 1, due_date: null, created_at: "", updated_at: "" },
  { id: "2", user_id: "1", title: "Configurar Supabase", description: "Auth + RLS policies", priority: "high", status: "done", position: 2, due_date: null, created_at: "", updated_at: "" },
  { id: "3", user_id: "1", title: "Construir Kanban Board", description: "Drag & drop", priority: "high", status: "in_progress", position: 1, due_date: null, created_at: "", updated_at: "" },
  { id: "4", user_id: "1", title: "Implementar RAG", description: "Chat con pgvector", priority: "medium", status: "in_progress", position: 2, due_date: null, created_at: "", updated_at: "" },
  { id: "5", user_id: "1", title: "Deploy en Vercel", description: "CI/CD automatizado", priority: "medium", status: "todo", position: 1, due_date: null, created_at: "", updated_at: "" },
  { id: "6", user_id: "1", title: "Agregar Dark Mode", description: "Tema oscuro", priority: "low", status: "todo", position: 2, due_date: null, created_at: "", updated_at: "" },
  { id: "7", user_id: "1", title: "Tests E2E", description: "Playwright", priority: "medium", status: "todo", position: 3, due_date: null, created_at: "", updated_at: "" },
];

export default function Home() {
  return <KanbanBoardStatic tasks={mockTasks} userEmail="user@email.com" />;
}
