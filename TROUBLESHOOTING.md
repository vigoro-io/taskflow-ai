# Troubleshooting - TaskFlow AI

## Chat no funciona: "Ocurrió un error al procesar tu consulta"

### Diagnóstico Rápido

Ejecuta el script de diagnóstico para identificar el problema:

```bash
npm run script:diagnose
```

Este script verifica:
- ✅ Variables de entorno configuradas
- ✅ Conexión a Supabase
- ✅ API de Voyage AI (embeddings)
- ✅ API de Claude/Anthropic (chat)

### Causas Comunes

#### 1. API Key de Anthropic inválida o faltante

**Síntoma:** El chat muestra "Ocurrió un error al procesar tu consulta. Intenta de nuevo."

**Solución:**

1. Verifica tu archivo `.env.local`:
   ```bash
   cat .env.local | grep ANTHROPIC_API_KEY
   ```

2. Si no tienes una API key o es inválida:
   - Ve a https://console.anthropic.com/
   - Crea una cuenta o inicia sesión
   - Ve a "API Keys" en el menú
   - Crea una nueva API key
   - Copia la key (empieza con `sk-ant-`)

3. Actualiza tu `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-tu-key-aqui
   ```

4. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

#### 2. No hay embeddings generados

**Síntoma:** El diagnóstico muestra "No hay embeddings generados"

**Solución:**

```bash
npm run script:embed-tasks
```

Este script:
- Obtiene todas las tareas de la base de datos
- Genera embeddings para cada tarea usando Voyage AI
- Almacena los embeddings en la tabla `task_embeddings`

**Nota:** Necesitas tareas en la base de datos primero. Si no tienes tareas, crea algunas desde el dashboard.

#### 3. API Key de Voyage AI inválida

**Síntoma:** Error al generar embeddings

**Solución:**

1. Ve a https://www.voyageai.com/
2. Crea una cuenta o inicia sesión
3. Obtén tu API key
4. Actualiza `.env.local`:
   ```bash
   VOYAGE_API_KEY=pa-tu-key-aqui
   ```

#### 4. Función RPC no existe en Supabase

**Síntoma:** Error "function match_task_embeddings does not exist"

**Solución:**

Las migraciones no se han ejecutado. Aplica manualmente las migraciones:

1. Ve al dashboard de Supabase (https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a SQL Editor
4. Ejecuta los archivos en orden:
   - `supabase/migrations/004_enable_vector.sql`
   - `supabase/migrations/005_task_embeddings.sql`
   - `supabase/migrations/006_match_embeddings.sql`

O si usas Supabase CLI:

```bash
supabase db push
```

## Tests Fallan

### Ejecutar tests específicos

```bash
# Tests de chat
npm test -- src/actions/__tests__/chat.test.ts

# Tests de search
npm test -- src/actions/__tests__/search.test.ts

# Tests de tasks
npm test -- src/actions/__tests__/tasks.test.ts

# Todos los tests con coverage
npm run test:coverage
```

### Errores comunes de mocking

Si los tests fallan con errores de mocking, verifica que:

1. Los mocks estén definidos **antes** de importar los módulos
2. Uses `vi.mock()` para módulos externos
3. Uses `vi.mocked()` para acceder a funciones mockeadas

Ver ejemplos en:
- `src/actions/__tests__/chat.test.ts`
- `src/actions/__tests__/search.test.ts`

## Tests E2E (Playwright)

### Usuario de prueba no puede iniciar sesión

**Solución:**

1. Verifica que el usuario existe en Supabase:
   ```bash
   # Usar Supabase dashboard o SQL Editor
   SELECT email, email_confirmed_at FROM auth.users WHERE email = 'test@taskflow.ai';
   ```

2. Si `email_confirmed_at` es NULL, confirma el email:
   ```bash
   npm run script:reset-password test@taskflow.ai testpassword123
   ```

3. Si el usuario no existe, créalo manualmente en Supabase Dashboard → Authentication → Add User

### Tests fallan en CI

El config de Playwright (`playwright.config.ts`) usa `workers: 1` en CI para evitar race conditions.

Si sigues teniendo problemas:

```bash
# Ejecuta en modo headed para ver qué pasa
npm run test:e2e:headed

# O con UI mode
npm run test:e2e:ui
```

## Errores de Build

### Error: Cannot find module '@/...'

**Solución:**

Reinicia el servidor TypeScript:

- **VS Code:** Cmd+Shift+P → "TypeScript: Restart TS Server"
- **Terminal:** Detén y reinicia el dev server

### Error: .next cache corrupted

**Solución:**

```bash
rm -rf .next
npm run dev
```

## Problemas de Performance

### Chat responde muy lento

**Causas:**

1. **Modelo de Claude:** Sonnet 4.5 es rápido, pero depende de la red
2. **Embeddings:** Si hay muchas tareas, la búsqueda puede tardar

**Soluciones:**

- Reduce `match_count` en `src/actions/chat.ts:16` (de 8 a 5)
- Aumenta `match_threshold` en `src/actions/chat.ts:16` (de 0.4 a 0.5)
- Verifica que el índice HNSW esté creado en `task_embeddings`

### Drag-and-drop lento en Kanban

**Solución:**

Verifica que `useKanbanDnd` esté memorizando correctamente los sensors:

```typescript
// src/hooks/use-kanban-dnd.ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }, // Aumentar si es muy sensible
  }),
  // ...
);
```

## Obtener Ayuda

Si el problema persiste:

1. Ejecuta el diagnóstico y guarda el output:
   ```bash
   npm run script:diagnose > diagnostic.txt
   ```

2. Revisa los logs del navegador (F12 → Console)

3. Revisa los logs del servidor (terminal donde corre `npm run dev`)

4. Busca errores similares en:
   - Tests unitarios: `npm run test`
   - Tests E2E: `npm run test:e2e`

5. Verifica que todas las dependencias estén instaladas:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
