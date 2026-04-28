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
npm run test                                       # Run all unit tests with Vitest
npm run test:watch                                 # Run unit tests in watch mode
npm run test -- <path>                             # Run specific test file (e.g., src/actions/__tests__/chat.test.ts)
npm run test:coverage                              # Run unit tests with coverage (80% threshold enforced)
npm run test:e2e                                   # Run E2E tests with Playwright
npm run test:e2e:ui                                # Run E2E tests with Playwright UI (interactive)
npm run test:e2e:headed                            # Run E2E tests in headed mode (see browser)
```

TypeScript strict mode is enforced in builds. No linter is configured.

### Utility Scripts

- **`scripts/reset-password.ts`** - Admin script to reset user passwords using Supabase Admin API. Requires `SUPABASE_SERVICE_ROLE_KEY`. Automatically confirms email (sets `email_confirmed_at`) to allow immediate login without email verification.
- **`scripts/diagnose-chat.ts`** - Diagnostic tool that verifies all chat system dependencies (API keys, database connection, RPC functions, embeddings). Checks Anthropic, Voyage AI, and Supabase configs.
- **`scripts/embed-all-tasks.ts`** - Batch-generates vector embeddings for all tasks using Voyage AI (voyage-3.5 model, 1024-dimensional). Processes 20 tasks at a time to stay within API limits.

## Environment Variables

Requires a `.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...              # Public anon key (safe in browser)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                  # Admin API key (server-side only, keep secret)
ANTHROPIC_API_KEY=sk-ant-...                          # Chat action (uses claude-haiku-4-5 by default, upgrades to claude-sonnet-4-5)
VOYAGE_API_KEY=pa-...                                 # Embeddings via Voyage AI (voyage-3.5, 1024-dimensional)
TEST_USER_EMAIL=test@taskflow.ai                      # Optional: E2E test user (defaults to test@taskflow.ai)
TEST_USER_PASSWORD=testpassword123                    # Optional: E2E test password (defaults to testpassword123)
```

**Get Supabase credentials:** Project Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` is **secret** — only use in server scripts, never in frontend code or `.env.example`

**Example `.env.example`** included for students — contains template without real values

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
| `tasks.ts` | getTasks, createTask, updateTaskStatus | Task CRUD and status updates; `createTask` also generates embeddings |
| `search.ts` | searchTasks | Semantic search via pgvector with status filtering |
| `chat.ts` | chatWithTasks | RAG chat with query normalization, semantic search, and Claude response |

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
- `src/components/ui/` - Radix UI primitives (button, dialog, select, input, card, badge, textarea, label)
- `src/components/kanban-board.tsx` - Main Kanban container (client component, uses three custom hooks)
- `src/components/kanban-column.tsx` - Droppable column with status badge
- `src/components/task-card.tsx` - Task card with priority badge and metadata
- `src/components/sortable-task-card.tsx` - Wrapper for dnd-kit sortable behavior
- `src/components/create-task-dialog.tsx` - Task creation form (dialog with title/description/priority/status inputs, calls `createTask` server action)
- `src/components/chat/task-chat.tsx` - AI chat interface (floating button + dialog with RAG search)
- `src/components/LoginForm.tsx` - Login form with password visibility toggle

**UI libraries:**
- `@dnd-kit/core` + `@dnd-kit/sortable` - Drag and drop
- `lucide-react` - Icons
- `class-variance-authority` + `clsx` + `tailwind-merge` - Styling utilities

### RAG / Chat pipeline

`src/components/chat/task-chat.tsx` renders the chat UI. On submit it calls `chatWithTasks` (Server Action in `src/actions/chat.ts`), which:

1. **Query normalization** via `normalizeQuery()` (`src/lib/query-normalizer.ts`):
   - Converts user intent words (e.g., "terminado", "en progreso") to canonical task statuses
   - Handles plural/singular and gender variants in Spanish
   - Returns structured query with extracted status filter and cleaned text

2. **Semantic search** via `searchTasks()` (`src/actions/search.ts`):
   - Embeds normalized query via Voyage AI (`src/lib/embeddings.ts` → `embedQuery`) using `input_type: "query"`
   - Calls `match_task_embeddings` RPC with dynamic threshold (0.4–0.5) and limit 8
   - Returns tasks sorted by cosine similarity; applies status filter if detected

3. **Response formatting**:
   - Retrieves context snippets; if <2 tasks found, returns short yes/no response (≤10 words)
   - Otherwise formats task context as numbered list with title + first 100 chars of description

4. **Chat generation with dual-model support**:
   - Automatically selects between Claude Haiku 4.5 (fast, concise) and Sonnet 4.5 (detailed analysis)
   - Default: Haiku with `isComplexQuery()` detection for complex questions
   - Max tokens: 150 (Haiku) or 300 (Sonnet) for strict conciseness
   - System prompt enforces "Sí/No" format with ≤10 word explanations for simple queries
   - Recognizes when users explicitly ask for details (via `isAskingForDetails()`) and switches to detailed mode

**Embedding generation:**
- When tasks are created/updated, `embedTask()` (`src/lib/embed-task.ts`) generates and upserts vectors
- Format: `title. description. Prioridad: X. Estado: Y`
- Uses Voyage AI `voyage-3.5` with `input_type: "document"` (document mode optimized for full task text)
- Query embeddings use `input_type: "query"` for better semantic matching
- Embeddings are 1024-dimensional halfvec, indexed with HNSW for fast cosine similarity search
- Batch processing: Voyage API supports up to 128 documents per request

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
- `src/actions/__tests__/chat.test.ts` - Chat action with model selection and response formatting
- `src/actions/__tests__/search.test.ts` - Semantic search with pgvector and RLS filtering
- `src/actions/__tests__/tasks.test.ts` - Task CRUD with embedding generation
- `src/hooks/__tests__/use-tasks-by-status.test.ts` - Hook for grouping tasks by status

**Mocking strategy:**
- Mock `@/lib/supabase/server` and `@/lib/supabase/client` entirely
- Mock `next/cache` for revalidatePath
- Mock external APIs (Anthropic, Voyage) for deterministic tests
- Use `vi.mock()` for module mocking
- Example pattern:
  ```typescript
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({ /* mock methods */ }))
  }));
  ```

### E2E Tests (Playwright)

- **Config:** `playwright.config.ts` - Chromium only, workers:1 in CI, auto-starts dev server on port 3000
- **Auth setup:** `e2e/auth.setup.ts` - Creates test user via Supabase Admin API, stores session in `.auth/user.json`
- **Location:** All E2E tests in `e2e/` directory
- **Retries:** 2 retries in CI, 0 in local development

**Test files:**
- `e2e/auth.setup.ts` - Creates authenticated session before test execution
- `e2e/login.spec.ts` - Login page display, form validation, redirect to dashboard, error messages
- `e2e/dashboard.spec.ts` - Kanban board display, task columns, task interaction, responsive layout

**Best practices:**
- Use semantic selectors: `getByRole()`, `getByLabel()`, `getByText()`
- Auth setup runs as dependency; chromium project waits for it
- Storage state persists between tests via `.auth/user.json`
- Trace data captured on first retry for debugging

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
- Export types explicitly from definition files

**Next.js patterns:**
- Server Components by default, `'use client'` only when needed (state, events, browser APIs)
- Server Actions for all mutations with `'use server'` directive
- Call `revalidatePath()` after mutations to refresh cached data
- Never fetch user data in Client Components — fetch in Server Components and pass as props

**Supabase:**
- RLS enabled on all tables - policies enforce user isolation
- Always use `auth.uid()` in policies, never `auth.jwt()`
- Use correct client: `server.ts` for Server Components/Actions, `client.ts` for Client Components

**Security:**
- API keys only in environment variables, never hardcoded
- Service role key only for admin scripts, never in frontend code
- Validate all external input (user queries, API responses)

**Error handling:**
- Wrap async operations in try/catch blocks with descriptive error messages
- Throw errors from Server Actions; client handles display
- Always resolve promises and handle async errors properly
- Return empty arrays/objects rather than null for missing data

**Spanish localization:**
- All UI labels, error messages, and placeholder text in Spanish
- Use `KANBAN_COLUMNS` and `PRIORITY_CONFIG` constants for display mappings (see `src/types/tasks.ts`)
- Task statuses: `"todo"` → "Por hacer", `"in_progress"` → "En progreso", `"done"` → "Terminado"
- Priority labels: `"low"` → "BAJA", `"medium"` → "MEDIA", `"high"` → "ALTA", `"critical"` → "CRÍTICA"
- Query normalization: `normalizeQuery()` in `src/lib/query-normalizer.ts` handles Spanish status aliases for semantic search

## Quick Reference

**Import patterns:**
```typescript
// Server Actions
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Client Components
"use client";
import { createClient } from "@/lib/supabase/client";

// Types
import type { Task, TaskStatus, TaskPriority } from "@/types/tasks";
import { KANBAN_COLUMNS, PRIORITY_CONFIG } from "@/types/tasks";

// AI/Embeddings
import { embedQuery, embedTask } from "@/lib/embeddings";
import { normalizeQuery } from "@/lib/query-normalizer";
```

**Testing patterns:**
- Unit tests live in `__tests__/` subdirectories (e.g., `src/actions/__tests__/chat.test.ts`)
- Mock Supabase: `vi.mock("@/lib/supabase/server", { createClient: vi.fn(...) })`
- Mock Anthropic: `vi.mock("@anthropic-ai/sdk")` with full response objects
- Mock Voyage: `vi.mock("voyageai")` to avoid real API calls
- E2E tests use authenticated session from `.auth/user.json` (populated by `e2e/auth.setup.ts`)
- Run specific test: `npm run test -- src/actions/__tests__/chat.test.ts`
- Coverage threshold enforced at 80% (lines, branches, functions, statements)

## Model Selection Logic

The chat system intelligently selects between Haiku and Sonnet based on query complexity:

**Haiku (default)** - Fast, concise responses:
- Simple yes/no questions
- Task status checks
- Quick queries about task counts
- Response format: "Sí/No" + ≤10 words

**Sonnet (automatic upgrade)** - Detailed analysis:
- Keywords: "analiza", "compara", "explica", "recomendaciones", etc.
- Long queries (>100 characters)
- Multiple questions (>1 question mark)
- Explicit detail requests: "cuéntame más", "amplia", "más detalles", etc.

User can override model selection via UI (if implemented in component).

## Troubleshooting

**First step:** Run the diagnostic script to identify configuration issues:
```bash
npm run script:diagnose
```

Common issues:

- **Chat error "Ocurrió un error...":** `ANTHROPIC_API_KEY` invalid/missing. See TROUBLESHOOTING.md for setup
- **No search results:** Run `npm run script:embed-tasks` to generate embeddings for existing tasks
- **Tests fail with coverage errors:** Ensure test files are in `__tests__/` subdirectories; excluded paths don't count toward coverage
- **Build errors:** Delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Port conflicts:** Kill all Node processes: `pkill -f "next dev"`
- **Path alias `@/*` not working:** Restart TypeScript server (Cmd+Shift+P in VS Code)
- **Auth not working:** Verify `middleware.ts` line 33 has `await supabase.auth.getUser()` call — do not remove
- **User can't login after password reset:** Check `email_confirmed_at` is not NULL in `auth.users`
- **RPC function error:** Run migrations: `supabase db push` or execute SQL files in order from `supabase/migrations/`
- **Test user email not confirming:** Use reset-password script: `npm run script:reset-password test@example.com password123`
- **E2E tests timeout:** Increase `timeout` in `playwright.config.ts` (currently 60000ms)
- **E2E tests fail on CI:** Check `workers: 1` is set in CI env to prevent race conditions

See **TROUBLESHOOTING.md** for detailed solutions and Spanish error messages.
