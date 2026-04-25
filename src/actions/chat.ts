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

export async function chatWithTasks(
  userMessage: string,
  model: ModelType = "haiku"
): Promise<ChatResponse> {
  const sources = await searchTasks(userMessage, 0.3, 10);

  // Determinar si la pregunta es compleja o si pide detalles
  const askingForDetails = isAskingForDetails(userMessage);
  const isComplex = isComplexQuery(userMessage);
  const suggestSonnet = isComplex && model === "haiku" && !askingForDetails;

  // Construir contexto más informativo
  let context = "";
  if (sources.length > 0) {
    context = "Tareas encontradas:\n" + sources.map((r, i) =>
      `${i + 1}. ${r.content}`
    ).join("\n");
  } else {
    context = "No se encontraron tareas que coincidan con la búsqueda.";
  }

  const systemPrompt = askingForDetails
    ? `Eres un asistente de gestión de tareas para TaskFlow AI.

${context}

El usuario está pidiendo DETALLES ESPECÍFICOS. Proporciona:
- Nombres de las tareas
- Estados y prioridades
- Fechas si son relevantes
- Sé completo pero organizado

Responde SOLO con información del contexto proporcionado arriba.`
    : `Eres un asistente conciso de gestión de tareas para TaskFlow AI.

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

  const anthropic = getAnthropicClient();
  const modelId = model === "sonnet" ? "claude-sonnet-4-5" : "claude-haiku-4-5";

  // Tokens más bajos para respuestas concisas
  // Haiku: 150 tokens (aprox 15-20 palabras), Sonnet: 300 para análisis complejos
  const maxTokens = model === "sonnet" ? 300 : 150;

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  return {
    answer: block.text,
    sources,
    isComplex,
    suggestSonnet,
  };
}
