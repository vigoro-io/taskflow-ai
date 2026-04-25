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
};

export async function chatWithTasks(userMessage: string): Promise<ChatResponse> {
  const sources = await searchTasks(userMessage, 0.4, 8);

  const context =
    sources.length > 0
      ? sources.map((r, i) => `[${i + 1}] ${r.content}`).join("\n")
      : "No se encontraron tareas relevantes.";

  const systemPrompt = `Eres un asistente de gestión de tareas para TaskFlow AI. Respondes preguntas sobre las tareas del usuario usando el contexto proporcionado.

Tareas relevantes encontradas:
${context}

Responde en español. Si la información no está en el contexto, indícalo claramente. Sé conciso y útil.`;

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return { answer: block.text, sources };
}
