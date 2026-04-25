/**
 * Normaliza y mapea palabras similares a estados de tareas
 */

import { type TaskStatus } from "@/types/tasks";

// Mapeo de palabras similares a estados reales
const STATUS_ALIASES: Record<string, TaskStatus> = {
  // Para "todo"
  pendiente: "todo",
  pendientes: "todo",
  "por hacer": "todo",
  "sin empezar": "todo",
  "no comenzado": "todo",
  "no iniciado": "todo",

  // Para "in_progress"
  "en progreso": "in_progress",
  progreso: "in_progress",
  "en proceso": "in_progress",
  proceso: "in_progress",
  haciendo: "in_progress",
  trabajando: "in_progress",
  "en desarrollo": "in_progress",
  desarrollo: "in_progress",
  activo: "in_progress",
  activos: "in_progress",
  activa: "in_progress",
  activas: "in_progress",

  // Para "done"
  terminado: "done",
  terminados: "done",
  terminada: "done",
  terminadas: "done",
  completo: "done",
  completos: "done",
  completa: "done",
  completas: "done",
  finalizado: "done",
  finalizados: "done",
  finalizada: "done",
  finalizadas: "done",
  hecho: "done",
  hechos: "done",
  hecha: "done",
  hechas: "done",
  listo: "done",
  listos: "done",
  lista: "done",
  listas: "done",
};

/**
 * Extrae estados mencionados en la consulta del usuario
 */
export function extractStatusFromQuery(query: string): TaskStatus[] {
  const normalizedQuery = query.toLowerCase();
  const statuses = new Set<TaskStatus>();

  // Buscar coincidencias exactas primero
  for (const [alias, status] of Object.entries(STATUS_ALIASES)) {
    if (normalizedQuery.includes(alias)) {
      statuses.add(status);
    }
  }

  // Si menciona "todo" o "todas" sin contexto específico, incluir todos los estados
  if ((normalizedQuery.includes("todas") || normalizedQuery.includes("todos")) &&
      !normalizedQuery.includes("estado") &&
      statuses.size === 0) {
    return ["todo", "in_progress", "done"];
  }

  return Array.from(statuses);
}

/**
 * Normaliza el texto de la consulta para búsqueda
 */
export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase();

  // Reemplazar alias por palabras estándar
  for (const [alias, status] of Object.entries(STATUS_ALIASES)) {
    if (normalized.includes(alias)) {
      const statusName = status === "todo" ? "por hacer" :
                        status === "in_progress" ? "en progreso" :
                        "terminado";
      normalized = normalized.replace(alias, statusName);
    }
  }

  return normalized;
}
