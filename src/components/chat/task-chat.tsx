"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Mic, MicOff, Zap, AlertCircle } from "lucide-react";
import { chatWithTasks } from "@/actions/chat";

// Web Speech API — types not yet in TypeScript's dom lib
interface SpeechRecognitionResult {
  readonly 0: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
  readonly 0: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => ISpeechRecognition;

type Message = {
  role: "user" | "assistant";
  content: string;
  suggestSonnet?: boolean;
};

const MAX_WORDS = 200;

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function TaskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [useSonnet, setUseSonnet] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleRecording() {
    const SpeechRecognitionClass = getSpeechRecognitionClass();

    // Web Speech API solo funciona en Chrome y navegadores Chromium
    if (!SpeechRecognitionClass) return;

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      handleInputChange(transcript);
    };

    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function handleInputChange(text: string) {
    const words = countWords(text);
    setWordCount(words);

    if (words > MAX_WORDS) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return; // No actualizar el input si excede el límite
    }

    setInput(text);
    setShowAlert(false);
  }

  async function handleSubmit(e: React.FormEvent, forceModel?: "haiku" | "sonnet") {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const words = countWords(query);
    if (words > MAX_WORDS) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    setInput("");
    setWordCount(0);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    try {
      const model = forceModel || (useSonnet ? "sonnet" : "haiku");
      const { answer, suggestSonnet } = await chatWithTasks(query, model);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, suggestSonnet },
      ]);

      // Si usamos Sonnet para esta pregunta, volver a Haiku para la siguiente
      if (useSonnet) {
        setUseSonnet(false);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ocurrió un error al procesar tu consulta. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const speechSupported = !!getSpeechRecognitionClass();

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Bot className="size-4 text-green-400" />
        <span className="text-sm font-medium text-white">Asistente de Tareas</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-neutral-500 text-sm text-center mt-8">
            Pregúntame sobre tus tareas
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 size-7 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Bot className="size-3.5 text-green-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-green-500/20 text-green-100"
                    : "bg-white/5 text-neutral-200"
                }`}
              >
                {msg.content}
              </div>

              {msg.role === "user" && (
                <div className="shrink-0 size-7 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="size-3.5 text-neutral-400" />
                </div>
              )}
            </div>

            {/* Sugerencia para usar Sonnet */}
            {msg.role === "assistant" && msg.suggestSonnet && !useSonnet && (
              <div className="flex justify-start mt-2 ml-10">
                <button
                  onClick={() => setUseSonnet(true)}
                  className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Zap className="size-3" />
                  Esta pregunta parece compleja. ¿Usar Sonnet para más detalle?
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 size-7 rounded-full bg-green-500/20 flex items-center justify-center">
              <Bot className="size-3.5 text-green-400" />
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-2.5 flex gap-1 items-center">
              <span className="size-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
        {/* Alerta de límite de palabras */}
        {showAlert && (
          <div className="flex items-center gap-2 mb-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Límite de {MAX_WORDS} palabras excedido. Por favor, acorta tu mensaje.</span>
          </div>
        )}

        {/* Indicador de modelo activo */}
        {useSonnet && (
          <div className="flex items-center gap-2 mb-2 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
            <Zap className="size-3.5 shrink-0" />
            <span>Sonnet activado para la próxima pregunta (más potente)</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="¿Qué tareas tengo pendientes?"
              disabled={loading}
              className="w-full bg-white/5 text-white text-sm placeholder:text-neutral-500 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-500/50 disabled:opacity-50"
            />
            {/* Contador de palabras */}
            <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
              wordCount > MAX_WORDS ? "text-red-400" : "text-neutral-500"
            }`}>
              {wordCount}/{MAX_WORDS}
            </div>
          </div>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            disabled={loading}
            title="Dictar mensaje (solo Chrome)"
            className={`shrink-0 size-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              recording
                ? "bg-red-500 animate-pulse"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {recording ? (
              <MicOff className="size-4 text-white" />
            ) : (
              <Mic className="size-4 text-neutral-300" />
            )}
          </button>
        )}

          <button
            type="submit"
            disabled={!input.trim() || loading || wordCount > MAX_WORDS}
            className="shrink-0 size-9 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}
