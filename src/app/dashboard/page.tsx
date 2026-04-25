import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/actions/tasks";
import { signOut } from "@/actions/auth";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskChat } from "@/components/chat/task-chat";
import { CreateTaskDialog } from "@/components/create-task-dialog";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tasks = await getTasks();

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">
            T
          </div>
          <span className="text-white font-semibold text-lg">
            TaskFlow <span className="text-neutral-400 font-normal">AI</span>
          </span>
        </div>

        <CreateTaskDialog />

        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <KanbanBoard initialTasks={tasks} />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-400">Tu asistente IA</h2>
          <div className="h-[600px]">
            <TaskChat />
          </div>
        </div>
      </main>
    </div>
  );
}
