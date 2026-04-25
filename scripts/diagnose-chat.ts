import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

async function diagnose() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const success: string[] = [];

  console.log("🔍 Diagnóstico del sistema de chat AI\n");
  console.log("=".repeat(50) + "\n");

  // 1. Verificar variables de entorno
  console.log("1️⃣  Verificando variables de entorno...");

  const requiredEnvVars = [
    { name: "ANTHROPIC_API_KEY", desc: "Claude API" },
    { name: "VOYAGE_API_KEY", desc: "Voyage AI embeddings" },
    { name: "NEXT_PUBLIC_SUPABASE_URL", desc: "Supabase URL" },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Supabase anon key" },
  ];

  for (const { name, desc } of requiredEnvVars) {
    if (!process.env[name]) {
      errors.push(`❌ ${name} no está configurado (${desc})`);
    } else if (
      process.env[name]?.includes("XXXXXXXX") ||
      process.env[name]?.includes("tu-")
    ) {
      errors.push(`❌ ${name} tiene un valor placeholder (${desc})`);
    } else {
      success.push(`✅ ${name} configurado`);
    }
  }

  console.log(success.join("\n"));
  if (errors.length > 0) {
    console.log(errors.join("\n"));
  }
  console.log();

  // 2. Verificar conexión a Supabase
  console.log("2️⃣  Verificando conexión a Supabase...");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.log("⏭️  Saltando verificación (credenciales faltantes)\n");
  } else {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    try {
      // Verificar si la tabla tasks existe
      const { error: tasksError, count: tasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      if (tasksError) {
        errors.push(`❌ Error accediendo a tabla tasks: ${tasksError.message}`);
      } else {
        success.push(
          `✅ Tabla tasks accesible (${tasksCount ?? 0} tareas encontradas)`
        );
      }

      // Verificar si la tabla task_embeddings existe
      const { error: embeddingsError, count: embeddingsCount } = await supabase
        .from("task_embeddings")
        .select("*", { count: "exact", head: true });

      if (embeddingsError) {
        errors.push(
          `❌ Error accediendo a tabla task_embeddings: ${embeddingsError.message}`
        );
      } else {
        if (embeddingsCount === 0) {
          warnings.push(
            `⚠️  No hay embeddings generados. Ejecuta: npx tsx scripts/embed-all-tasks.ts`
          );
        } else {
          success.push(
            `✅ Tabla task_embeddings tiene ${embeddingsCount} embeddings`
          );
        }
      }

      // Verificar función RPC match_task_embeddings
      const testEmbedding = new Array(1024).fill(0);
      const { error: rpcError } = await supabase.rpc("match_task_embeddings", {
        query_embedding: JSON.stringify(testEmbedding),
        match_threshold: 0.5,
        match_count: 1,
      });

      if (rpcError) {
        errors.push(`❌ Error en función RPC: ${rpcError.message}`);
      } else {
        success.push(`✅ Función RPC match_task_embeddings funciona`);
      }
    } catch (error: any) {
      errors.push(`❌ Error de conexión: ${error.message}`);
    }

    console.log(
      success
        .filter((s) => s.includes("Tabla") || s.includes("Función"))
        .join("\n")
    );
    if (warnings.length > 0) {
      console.log(warnings.join("\n"));
    }
    if (
      errors.filter((e) => e.includes("tabla") || e.includes("RPC")).length > 0
    ) {
      console.log(
        errors.filter((e) => e.includes("tabla") || e.includes("RPC")).join("\n")
      );
    }
    console.log();
  }

  // 3. Verificar Voyage AI
  console.log("3️⃣  Verificando Voyage AI...");

  if (!process.env.VOYAGE_API_KEY) {
    console.log("⏭️  Saltando verificación (API key faltante)\n");
  } else {
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "voyage-3.5",
          input: ["test"],
          input_type: "query",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        errors.push(`❌ Voyage AI error ${response.status}: ${error}`);
      } else {
        success.push(`✅ Voyage AI funciona correctamente`);
      }
    } catch (error: any) {
      errors.push(`❌ Error conectando a Voyage AI: ${error.message}`);
    }

    const voyageSuccess = success.filter((s) => s.includes("Voyage"))[0];
    const voyageError = errors.filter((e) => e.includes("Voyage"))[0];
    console.log(voyageSuccess || voyageError || "⚠️  Error desconocido");
    console.log();
  }

  // 4. Verificar Claude AI
  console.log("4️⃣  Verificando Claude AI (Anthropic)...");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("⏭️  Saltando verificación (API key faltante)\n");
  } else {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });

      if (response.content[0]?.type === "text") {
        success.push(`✅ Claude API funciona correctamente`);
      } else {
        warnings.push(`⚠️  Claude API responde pero con formato inesperado`);
      }
    } catch (error: any) {
      if (error.status === 401) {
        errors.push(`❌ Claude API: API key inválida`);
      } else if (error.status === 429) {
        warnings.push(`⚠️  Claude API: Rate limit alcanzado (pero key es válida)`);
      } else {
        errors.push(`❌ Claude API error: ${error.message}`);
      }
    }

    const claudeSuccess = success.filter((s) => s.includes("Claude"))[0];
    const claudeWarning = warnings.filter((w) => w.includes("Claude"))[0];
    const claudeError = errors.filter((e) => e.includes("Claude"))[0];
    console.log(claudeSuccess || claudeWarning || claudeError || "⚠️  Error desconocido");
    console.log();
  }

  // Resumen final
  console.log("=".repeat(50));
  console.log("\n📊 RESUMEN:\n");

  const totalErrors = errors.length;
  const totalWarnings = warnings.length;

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log("🎉 Todo está configurado correctamente!");
    console.log(
      "\n💡 Si el chat sigue sin funcionar, verifica los logs del navegador"
    );
    console.log("   y asegúrate de que el usuario esté autenticado.");
  } else {
    if (totalErrors > 0) {
      console.log(`❌ ${totalErrors} error(es) encontrado(s):`);
      errors.forEach((e) => console.log("   " + e));
      console.log();
    }

    if (totalWarnings > 0) {
      console.log(`⚠️  ${totalWarnings} advertencia(s):`);
      warnings.forEach((w) => console.log("   " + w));
      console.log();
    }

    console.log("\n🔧 SOLUCIONES RECOMENDADAS:\n");

    if (errors.some((e) => e.includes("API key") || e.includes("configurado") || e.includes("placeholder"))) {
      console.log("1. Verifica tu archivo .env.local");
      console.log("2. Copia .env.example a .env.local si no existe");
      console.log("3. Completa todas las API keys con valores reales");
      console.log();
    }

    if (errors.some((e) => e.includes("tabla") || e.includes("RPC"))) {
      console.log("1. Ejecuta las migraciones de Supabase:");
      console.log("   supabase db push");
      console.log("2. O aplica manualmente los archivos en supabase/migrations/");
      console.log();
    }

    if (warnings.some((w) => w.includes("embeddings"))) {
      console.log("1. Genera embeddings para las tareas existentes:");
      console.log("   npx tsx scripts/embed-all-tasks.ts");
      console.log();
    }
  }

  console.log();
}

diagnose().catch((error) => {
  console.error("❌ Error ejecutando diagnóstico:", error);
  process.exit(1);
});
