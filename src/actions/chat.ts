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

  // Determinar si la pregunta es compleja
  const isComplex = isComplexQuery(userMessage);
  const suggestSonnet = isComplex && model === "haiku";

  // Construir contexto más informativo
  let context = "";
  if (sources.length > 0) {
    context = "Tareas encontradas:\n" + sources.map((r, i) =>
      `${i + 1}. ${r.content}`
    ).join("\n");
  } else {
    context = "No se encontraron tareas que coincidan con la búsqueda.";
  }

  const systemPrompt = `Eres un asistente de gestión de tareas para TaskFlow AI.

IMPORTANTE: Debes responder basándote ÚNICAMENTE en las tareas que se te proporcionan abajo. Si las tareas muestran información, debes reportarla fielmente.

${context}

INSTRUCCIONES:
1. Responde en español de forma concisa y directa
2. Si encuentras tareas en el contexto, menciona su cantidad exacta y detalles relevantes
3. Si no hay tareas, indica claramente "No hay tareas [estado solicitado]"
4. Usa los datos exactos del contexto (estado, prioridad, fechas)
5. No inventes información que no esté en el contexto

ESTADOS DE TAREAS:
- "por hacer" = tareas pendientes/por comenzar
- "en progreso" = tareas activas/en desarrollo
- "terminado" = tareas completadas/finalizadas`;

  const anthropic = getAnthropicClient();
  const modelId = model === "sonnet" ? "claude-sonnet-4-5" : "claude-haiku-4-5";

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 512,
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
