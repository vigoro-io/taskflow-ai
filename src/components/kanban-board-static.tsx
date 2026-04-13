import { Plus } from "lucide-react";
import { type Task, KANBAN_COLUMNS } from "@/types/tasks";
import { TaskCard } from "@/components/task-card";

type KanbanBoardStaticProps = {
  tasks: Task[];
  userEmail: string;
};

export function KanbanBoardStatic({ tasks, userEmail }: KanbanBoardStaticProps) {
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

        <button className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="size-4" />
          Nueva Tarea
        </button>

        <span className="text-sm text-neutral-400">{userEmail}</span>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div
                key={column.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[400px] shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-white font-semibold">{column.label}</h2>
                  <span className="text-xs text-neutral-300 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
