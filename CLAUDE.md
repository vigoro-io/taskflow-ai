# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                                        # Start dev server at localhost:3000
npm run build                                      # Production build (also runs type-check)
npm run start                                      # Start production server
npm run script:reset-password <email> <password>   # Reset Supabase user password & confirm email
npm run script:diagnose                            # Diagnose chat/API configuration issues
npm run script:embed-tasks                         # Generate embeddings for all tasks
npm run test                                       # Run unit tests with Vitest
npm run test:watch                                 # Run unit tests in watch mode
npm run test:coverage                              # Run unit tests with coverage report (80% threshold)
npm run test:e2e       # Run E2E tests with Playwright
npm run test:e2e:ui    # Run E2E tests with Playwright UI
```

No linter is configured.

### Utility Scripts

- **`scripts/reset-password.ts`** - Admin script to reset user passwords using Supabase Admin API. Requires `SUPABASE_SERVICE_ROLE_KEY`. Automatically confirms email to allow immediate login.
- **`scripts/diagnose-chat.ts`** - Diagnostic tool that verifies all chat system dependencies (API keys, database, RPC functions). Run with: `npm run script:diagnose`
- **`scripts/embed-all-tasks.ts`** - Batch-generates vector embeddings for all tasks using Voyage AI (voyage-3.5). Processes 20 tasks at a time. Run with: `npm run script:embed-tasks`

## Environment Variables

Requires a `.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...              # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                  # Admin API key (scripts only, keep secret)
ANTHROPIC_API_KEY=sk-ant-...                          # Chat action (claude-sonnet-4-5)
VOYAGE_API_KEY=pa-...                                 # Embeddings via Voyage AI (voyage-3.5, 1024-dim)
TEST_USER_EMAIL=test@taskflow.ai                      # Optional: E2E test user (defaults to test@taskflow.ai)
TEST_USER_PASSWORD=testpassword123                    # Optional: E2E test password (defaults to testpassword123)
```

**Get Supabase credentials:** Project Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` is **secret** - only use in server scripts, never in frontend code

## Architecture

**Next.js 15 App Router** with React 19 and TypeScript. All routes live under `src/app/`.

**Path alias:** `@/*` maps to `src/*` (configured in `tsconfig.json`)

### File structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard with Kanban board
│   ├── login/              # Login page
│   └── page.tsx            # Landing/home page
├── actions/                # Server Actions (auth, tasks, chat, search)
├── components/             # React components
│   ├── ui/                 # Radix UI primitives
│   └── chat/               # Chat interface
├── hooks/                  # Custom React hooks
├── lib/                    # Shared libraries
│   ├── supabase/           # Supabase client factories
│   ├── embeddings.ts       # Voyage AI integration
│   ├── embed-task.ts       # Task embedding helpers
│   └── utils.ts            # Utility functions
└── types/                  # TypeScript type definitions

middleware.ts               # Auth session refresh (root level)
```

### Data flow

1. **Server Actions** (`src/actions/`) call Supabase directly using `createClient()` from `src/lib/supabase/server.ts`.
   - All files use `"use server"` directive at the top
   - Actions call `revalidatePath("/dashboard")` after mutations to refresh cached data
   - Error handling: throw errors with descriptive messages, let client handle display
2. **Dashboard page** (`src/app/dashboard/page.tsx`) fetches tasks server-side via `getTasks()` and passes them to the `KanbanBoard` client component.
3. **KanbanBoard** (`src/components/kanban-board.tsx`) manages drag-and-drop using dnd-kit and three custom hooks:
   - `useTasksByStatus` — groups tasks by status (todo/in_progress/done) into columns
   - `useMoveTask` — calls `updateTaskStatus` server action with optimistic updates
   - `useKanbanDnd` — configures dnd-kit sensors (pointer, touch, keyboard) and handles drag events
4. **Drag-and-drop behavior:**
   - `DndContext` uses `closestCorners` collision detection
   - Sensors include pointer (8px activation distance), touch (250ms delay), and keyboard navigation
   - Tasks can be dropped on column headers (droppable areas) or other tasks
   - On drop, extracts new status from the drop target and calls `moveTask` if status changed

### Server Actions pattern

All mutations go through Server Actions in `src/actions/`:

| File | Actions | Purpose |
|------|---------|---------|
| `auth.ts` | login, signOut | Authentication operations |
| `tasks.ts` | getTasks, updateTaskStatus | Task read and status updates (create/delete actions not yet implemented) |
| `search.ts` | searchTasks | Semantic search via pgvector |
| `chat.ts` | chatWithTasks | RAG chat with Claude |

**Pattern:**
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function actionName(params) {
  const supabase = await createClient();
  // ... perform operation
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard"); // Refresh cached data
}
```

### Auth

**Middleware (`middleware.ts`):**
- Refreshes Supabase session on every request (required for SSR auth)
- **CRITICAL:** The `await supabase.auth.getUser()` call (line 33) must stay even though the result isn't used. Removing it breaks authentication - it triggers the session refresh mechanism.
- **DO NOT** run code between `createServerClient` and `supabase.auth.getUser()` - this can cause random logouts

**Login flow:**
- `src/app/login/page.tsx` - Server Component with login server action
- `src/components/LoginForm.tsx` - Client Component with show/hide password toggle
- `src/actions/auth.ts` - Server actions (login, signOut)

**Auth guards:**
- `src/app/dashboard/page.tsx` redirects unauthenticated users to `/login`

**Supabase clients:**
- `src/lib/supabase/server.ts` - For Server Components, Route Handlers, Server Actions (async function)
- `src/lib/supabase/client.ts` - For Client Components (sync function)

### Key types

Defined in `src/types/tasks.ts`: `Task`, `TaskStatus` (`"todo" | "in_progress" | "done"`), `TaskPriority` (`"low" | "medium" | "high" | "critical"`).

**Display constants:**
- `KANBAN_COLUMNS` - Maps status to Spanish labels (Por hacer, En progreso, Terminado)
- `PRIORITY_CONFIG` - Maps priority to Spanish labels (BAJA, MEDIA, ALTA, CRÍTICA) with Tailwind classes

Always use these constants instead of hardcoding strings.

### UI Components

**Styling:** Tailwind CSS v4 (PostCSS). Dark theme with green accents — background `#0f0f1a`. Spanish labels throughout.

**Component structure:**
- `src/components/ui/` - Radix UI primitives (button, dialog, select, input, card, badge)
- `src/components/kanban-board.tsx` - Main Kanban container (client component)
- `src/components/kanban-column.tsx` - Droppable column with status badge
- `src/components/task-card.tsx` - Task card with priority badge and metadata
- `src/components/sortable-task-card.tsx` - Wrapper for dnd-kit sortable behavior
- `src/components/chat/task-chat.tsx` - AI chat interface (floating button + dialog)
- `src/components/LoginForm.tsx` - Login form with password visibility toggle

**UI libraries:**
- `@dnd-kit/core` + `@dnd-kit/sortable` - Drag and drop
- `lucide-react` - Icons
- `class-variance-authority` + `clsx` + `tailwind-merge` - Styling utilities

### RAG / Chat pipeline

`src/components/chat/task-chat.tsx` renders the chat UI. On submit it calls `chatWithTasks` (Server Action in `src/actions/chat.ts`), which:

1. Embeds the user query via Voyage AI (`src/lib/embeddings.ts` → `embedQuery`)
   - Uses `input_type: "query"` for optimal retrieval performance
2. Calls `searchTasks` (`src/actions/search.ts`) with threshold 0.4 and limit 8
   - Runs the `match_task_embeddings` Supabase RPC function
   - Returns tasks sorted by cosine similarity (1 - distance)
3. Formats retrieved task snippets as numbered context
4. Sends context + user message to Claude Sonnet 4.5 (max_tokens: 1024)
5. Returns AI response with sources

**Embedding generation:**
- When tasks are created/updated, call `embedTask` (`src/lib/embed-task.ts`) to upsert vectors
- Format: `title. description. Prioridad: X. Estado: Y`
- Uses Voyage AI `voyage-3.5` model with `input_type: "document"`
- Embeddings are 1024-dimensional, stored as `halfvec` for efficiency

### Database schema

**Tables:**
- `profiles` - User profiles linked to `auth.users`, auto-created via trigger on signup
- `tasks` - User tasks with status (todo/in_progress/done), priority (low/medium/high/critical), position for ordering
- `task_embeddings` - Vector embeddings (halfvec(1024)) for semantic search with HNSW cosine index

**Migrations:**

SQL migrations live in `supabase/migrations/` (numbered `004_` onwards - earlier migrations may exist for profiles/tasks/RLS setup):

| Migration | Purpose |
|-----------|---------|
| `004_enable_vector.sql` | Enables pgvector extension |
| `005_task_embeddings.sql` | Creates task_embeddings table with HNSW index and RLS |
| `006_match_embeddings.sql` | Creates match_task_embeddings() RPC function |

**Important:**
- The `match_task_embeddings` function is `SECURITY DEFINER` and must always set `search_path = public`
- RLS is enabled on all tables. Always use `auth.uid()` in policies, never `auth.jwt()`
- The function enforces RLS by filtering `WHERE te.user_id = auth.uid()` internally

## Testing

### Unit Tests (Vitest)

- **Config:** `vitest.config.ts` - jsdom environment, v8 coverage with 80% thresholds
- **Setup:** `vitest.setup.ts` - imports @testing-library/jest-dom matchers
- **Location:** Tests live next to source files in `__tests__/` directories

**Test files:**
- `src/actions/__tests__/tasks.test.ts` - Server actions with mocked Supabase
- `src/hooks/__tests__/use-tasks-by-status.test.ts` - Hook tests with renderHook

**Mocking strategy:**
- Mock `@/lib/supabase/server` and `@/lib/supabase/client` entirely
- Mock `next/cache` for revalidatePath
- Use `vi.mock()` for module mocking
- Example pattern:
  ```typescript
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({ /* mock methods */ }))
  }));
  ```

### E2E Tests (Playwright)

- **Config:** `playwright.config.ts` - Chromium only, workers:1 in CI, auto-starts dev server
- **Auth setup:** `e2e/auth.setup.ts` - Creates test user via Supabase Admin API, stores session in `.auth/user.json`
- **Location:** All E2E tests in `e2e/` directory

**Test files:**
- `e2e/login.spec.ts` - Login flow, error handling, auth guards (3 tests)
- `e2e/dashboard.spec.ts` - Kanban columns, tasks display, UI elements (4 tests)

**Best practices:**
- Use semantic selectors: `getByRole()`, `getByLabel()`, `getByText()`
- Auth setup runs first as dependency of chromium project
- Storage state persists between tests for performance

### Custom Hooks

Three main hooks power the Kanban board:

| Hook | File | Purpose |
|------|------|---------|
| `useTasksByStatus` | `src/hooks/use-tasks-by-status.ts` | Groups tasks array by status into columns object |
| `useMoveTask` | `src/hooks/use-move-task.ts` | Optimistic updates + calls updateTaskStatus server action |
| `useKanbanDnd` | `src/hooks/use-kanban-dnd.ts` | Configures dnd-kit sensors and drag event handlers |

**Pattern:**
- Hooks live in `src/hooks/` with tests in `__tests__/` subdirectory
- Use React 19 hooks (useState, useMemo, useTransition, etc.)
- Memoize expensive calculations with `useMemo`

## Development Rules

**TypeScript:**
- Strict mode enabled - never use `any`
- Always define proper types, import from `src/types/`

**Next.js patterns:**
- Server Components by default, `'use client'` only when needed (state, events, browser APIs)
- Server Actions for all mutations with `'use server'` directive
- Call `revalidatePath()` after mutations to refresh cached data

**Supabase:**
- RLS enabled on all tables - policies enforce user isolation
- Always use `auth.uid()` in policies, never `auth.jwt()`
- Use correct client: server.ts for Server Components/Actions, client.ts for Client Components

**Security:**
- API keys only in environment variables, never hardcoded
- Service role key only for admin scripts, never in frontend code

**Error handling:**
- Wrap async operations in try/catch
- Throw descriptive errors from Server Actions
- Let client components handle error display to users

## Troubleshooting

**First step:** Run the diagnostic script to identify configuration issues:
```bash
npm run script:diagnose
```

Common issues:

- **Chat error "Ocurrió un error...":** ANTHROPIC_API_KEY is invalid or missing. See TROUBLESHOOTING.md
- **No search results:** Run `npm run script:embed-tasks` to generate embeddings
- **Build errors:** Delete `.next/` folder and restart dev server
- **Port conflicts:** Multiple dev servers running? Kill all with `pkill -f "next dev"`
- **Path alias `@/*` not working:** Restart TypeScript server in IDE
- **Auth not working:** Verify middleware.ts has `await supabase.auth.getUser()` call
- **User can't login after password reset:** User's `email_confirmed_at` must not be NULL in `auth.users` table
- **RPC function not found:** Run migrations in `supabase/migrations/`

See **TROUBLESHOOTING.md** for detailed solutions.
