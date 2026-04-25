import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Faltan variables de entorno");
  console.error("   Asegúrate que .env.local contiene:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Cliente admin con service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'auth'
  }
});

async function resetPassword(email: string, newPassword: string) {
  console.log(`🔄 Reseteando password para: ${email}`);

  // Validaciones
  if (!email.includes("@")) {
    console.error("❌ Email inválido");
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("❌ El password debe tener al menos 6 caracteres");
    process.exit(1);
  }

  try {
    // Ejecutar SQL directo para resetear password
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE auth.users
        SET
          encrypted_password = crypt($1, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
        WHERE email = $2
        RETURNING id, email, email_confirmed_at;
      `,
      params: [newPassword, email]
    });

    if (error) {
      console.error("❌ La función exec_sql no está disponible.");
      console.error("\n💡 Ejecuta este SQL manualmente en Supabase Dashboard → SQL Editor:\n");
      console.error(`UPDATE auth.users`);
      console.error(`SET encrypted_password = crypt('${newPassword}', gen_salt('bf')),`);
      console.error(`    email_confirmed_at = COALESCE(email_confirmed_at, now()),`);
      console.error(`    updated_at = now()`);
      console.error(`WHERE email = '${email}';`);
     console.error(`\n🔗 URL: https://supabase.com/dashboard/project/${supabaseUrl?.split("//")[1]?.split(".")[0] ?? 'unknown'}/sql/new`);
      process.exit(1);
    }

    console.log("✅ Password reseteado exitosamente");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nuevo password: ${newPassword}`);
    console.log(`✉️  Email confirmado: Sí`);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    console.error("\n💡 Ejecuta este SQL manualmente en Supabase Dashboard → SQL Editor:\n");
    console.error(`UPDATE auth.users`);
    console.error(`SET encrypted_password = crypt('${newPassword}', gen_salt('bf')),`);
    console.error(`    email_confirmed_at = COALESCE(email_confirmed_at, now()),`);
    console.error(`    updated_at = now()`);
    console.error(`WHERE email = '${email}';`);
      console.error(`\n🔗 URL: https://supabase.com/dashboard/project/${supabaseUrl?.split("//")?.[1]?.split(".")?.[0] ?? "unknown"}/sql/new`);
    process.exit(1);
  }
}

// Parsear argumentos de línea de comandos
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("❌ Uso incorrecto");
  console.log("\n📖 Uso:");
  console.log("   npm run script:reset-password <email> <password>\n");
  console.log("📝 Ejemplo:");
  console.log("   npm run script:reset-password usuario1@test.com password123\n");
  process.exit(1);
}

resetPassword(email, password);
