"use server";

import Anthropic from "@anthropic-ai/sdk";
import { searchTasks, type SearchResult } from "@/actions/search";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada");
  }

  return new Anthropic({ apiKey });
}

export type ChatResponse = {
  answer: string;
  sources: SearchResult[];
  isComplex?: boolean;
  suggestSonnet?: boolean;
};

type ModelType = "haiku" | "sonnet";

/**
 * Detecta si el usuario está pidiendo explícitamente más detalles
 */
function isAskingForDetails(query: string): boolean {
  const detailKeywords = [
    "más detalle", "cuéntame más", "explica", "explicación", "detalles",
    "dime más", "amplia", "profundiza", "describe", "qué más",
    "información completa", "todo sobre", "lista completa"
  ];

  const lowerQuery = query.toLowerCase();
  return detailKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Detecta si una pregunta es compleja y requiere Sonnet
 */
function isComplexQuery(query: string): boolean {
  const complexKeywords = [
    "analiza", "análisis", "compara", "comparación", "explica", "explicación",
    "detalla", "detallado", "profundiza", "estrategia", "plan", "planifica",
    "recomienda", "recomendación", "sugiere", "sugerencia", "optimiza",
    "prioriza", "priorización", "resume", "resumen", "ayúdame a decidir"
  ];

  const lowerQuery = query.toLowerCase();

  // Detectar si contiene palabras complejas
  const hasComplexKeywords = complexKeywords.some(keyword =>
    lowerQuery.includes(keyword)
  );

  // Detectar si la pregunta es larga (más de 100 caracteres)
  const isLongQuery = query.length > 100;

  // Detectar si tiene múltiples preguntas
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;

  return hasComplexKeywords || isLongQuery || hasMultipleQuestions;
}

/**
 * Formatea el contexto de tareas para el prompt
 * Responsabilidad: convertir SearchResults en string legible
 */
function formatContext(sources: SearchResult[]): string {
  if (sources.length > 0) {
    return "Tareas encontradas:\n" + sources.map((r, i) =>
      `${i + 1}. ${r.content}`
    ).join("\n");
  }
  return "No se encontraron tareas que coincidan con la búsqueda.";
}

/**
 * Construye el system prompt basado en el tipo de respuesta esperada
 * Responsabilidad: generar prompt según contexto y estilo
 */
function buildSystemPrompt(context: string, askingForDetails: boolean): string {
  if (askingForDetails) {
    return `Eres un asistente de gestión de tareas para TaskFlow AI.

${context}

El usuario está pidiendo DETALLES ESPECÍFICOS. Proporciona:
- Nombres de las tareas
- Estados y prioridades
- Fechas si son relevantes
- Sé completo pero organizado

Responde SOLO con información del contexto proporcionado arriba.`;
  }

  return `Eres un asistente conciso de gestión de tareas para TaskFlow AI.

${context}

FORMATO OBLIGATORIO DE RESPUESTA:
1. Comienza con "Sí" o "No"
2. Máximo 10 palabras de explicación
3. Si hay más info, termina con: "¿Necesitas más detalle?"

EJEMPLOS CORRECTOS:
"Sí, tienes 3 tareas por hacer. ¿Necesitas más detalle?"
"No, no hay tareas pendientes."
"Sí, 4 tareas en progreso actualmente."

NO HAGAS:
- Explicaciones largas sin que lo pidan
- Listar detalles a menos que pregunten específicamente
- Inventar información no presente en el contexto

ESTADOS:
- "por hacer" = pendiente
- "en progreso" = activo
- "terminado" = completo`;
}

/**
 * Selecciona el modelo y configuración basado en la complejidad de la query
 * Responsabilidad: mapear condiciones → config de modelo
 */
function selectModelConfig(
  userModel: ModelType,
  askingForDetails: boolean,
  isComplex: boolean
): { modelId: string; maxTokens: number } {
  // Si pide detalles explícitamente, usa Sonnet
  if (askingForDetails) {
    return { modelId: "claude-sonnet-4-5", maxTokens: 300 };
  }

  // Si la pregunta es compleja, usa Sonnet
  if (isComplex && userModel === "haiku") {
    return { modelId: "claude-sonnet-4-5", maxTokens: 300 };
  }

  // Default: usa el modelo seleccionado
  const modelId = userModel === "sonnet" ? "claude-sonnet-4-5" : "claude-haiku-4-5";
  const maxTokens = userModel === "sonnet" ? 300 : 150;

  return { modelId, maxTokens };
}

/**
 * Orquestador principal del chat con tareas
 * Responsabilidad: coordinar búsqueda, formateo y generación de respuesta
 */
export async function chatWithTasks(
  userMessage: string,
  model: ModelType = "haiku"
): Promise<ChatResponse> {
  // Buscar tareas relevantes
  const sources = await searchTasks(userMessage, 0.3, 10);

  // Análisis de la query
  const askingForDetails = isAskingForDetails(userMessage);
  const isComplex = isComplexQuery(userMessage);

  // Construir contexto y prompt
  const context = formatContext(sources);
  const systemPrompt = buildSystemPrompt(context, askingForDetails);
  const { modelId, maxTokens } = selectModelConfig(model, askingForDetails, isComplex);

  // Llamar a Claude
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extraer respuesta
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  return {
    answer: block.text,
    sources,
    isComplex,
    suggestSonnet: isComplex && model === "haiku" && !askingForDetails,
  };
}
