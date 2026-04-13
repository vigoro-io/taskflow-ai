# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build (also runs type-check)
npm run start    # Start production server
```

No linter or test runner is configured.

## Environment Variables

Requires a `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # chat action (claude-sonnet-4-5)
VOYAGE_API_KEY=           # embeddings via Voyage AI (voyage-3.5, 1024-dim)
```

## Architecture

**Next.js 15 App Router** with React 19 and TypeScript. All routes live under `src/app/`.

### Data flow

1. **Server Actions** (`src/actions/`) call Supabase directly using `createClient()` from `src/lib/supabase/server.ts`.
2. **Dashboard page** (`src/app/dashboard/page.tsx`) fetches tasks server-side via `getTasks()` and passes them to the `KanbanBoard` client component.
3. **KanbanBoard** manages client state through three hooks:
   - `useTasksByStatus` — groups tasks into the three columns
   - `useMoveTask` — calls `updateTaskStatus` server action with optimistic updates
   - `useKanbanDnd` — wraps dnd-kit events and delegates to `moveTask`

### Auth

- `middleware.ts` refreshes the Supabase session on every request (required for SSR auth).
- `src/app/dashboard/page.tsx` redirects unauthenticated users to `/login`.
- Two Supabase clients: `src/lib/supabase/server.ts` (Server Components/Actions) and `src/lib/supabase/client.ts` (browser).

### Key types

Defined in `src/types/tasks.ts`: `Task`, `TaskStatus` (`"todo" | "in_progress" | "done"`), `TaskPriority`. `KANBAN_COLUMNS` and `PRIORITY_CONFIG` are the display-layer constants — use these instead of hardcoding strings.

### UI

Tailwind CSS v4 (PostCSS). Shadcn components are in `src/components/ui/`. Dark theme with green accents — background `#0f0f1a`. Spanish labels throughout.

### RAG / Chat pipeline

`src/components/chat/` renders the chat UI. On submit it calls `chatWithTasks` (Server Action in `src/actions/chat.ts`), which:

1. Embeds the query via Voyage AI (`src/lib/embeddings.ts` → `embedQuery`)
2. Calls `searchTasks` (`src/actions/search.ts`) which runs the `match_task_embeddings` Supabase RPC
3. Passes retrieved task snippets as context to Claude (`claude-sonnet-4-5`) and streams the answer

When a task is created or updated, call `embedTask` (`src/lib/embed-task.ts`) to upsert its vector into `task_embeddings`.

### Database migrations

SQL migrations live in `supabase/migrations/` (numbered `004_`…). The `task_embeddings` table (migration `005`) uses `halfvec(1024)` with an HNSW cosine index and RLS. The `match_task_embeddings` function (migration `006`) is `SECURITY DEFINER` and must always set `search_path = public`.


### Reglas obligatorias:
- Siempre TypeScript strict, nunca usar 'any'
- Server Components por defecto, 'use client' solo cuando necesario
- Server Actions para todas las mutaciones
- RLS habilitado en todas las tablas
- API keys solo en variables de entorno, nunca en el codigo
- useMemo para calculos pesados
- Manejo de errores en todos los try/catch

Cuando el contexto sea largo:
- Usar /compact antes de continuar
- Usar /cost al terminar cada tarea
- Modelo por defecto: Sonnet. Solo Opus para arquitectura compleja