import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno
config({ path: resolve(process.cwd(), ".env.local") });

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@taskflow.ai";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "testpassword123";
const authFile = ".auth/user.json";

setup("authenticate", async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  // Cliente admin para crear usuario si no existe
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Intentar crear el usuario de prueba (ignorar error si ya existe)
  try {
    await adminClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });
  } catch (error) {
    // Usuario ya existe, continuar
    console.log("Test user already exists");
  }

  // Navegar a la página de login
  await page.goto("/login");

  // Llenar el formulario de login usando selectores semánticos
  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/password|contraseña/i).fill(TEST_USER_PASSWORD);

  // Hacer clic en el botón de login
  await page.getByRole("button", { name: /iniciar sesión|login|entrar/i }).click();

  // Esperar a que la navegación al dashboard complete
  await page.waitForURL("/dashboard");

  // Guardar el estado de autenticación
  await page.context().storageState({ path: authFile });
});
