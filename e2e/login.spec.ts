import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Sin autenticación

  test("la página de login es visible", async ({ page }) => {
    await page.goto("/login");

    // Verificar que el formulario de login existe
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|contraseña/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /iniciar sesión|login|entrar/i })
    ).toBeVisible();
  });

  test("muestra error con credenciales inválidas", async ({ page }) => {
    await page.goto("/login");

    // Llenar con credenciales incorrectas
    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.getByLabel(/password|contraseña/i).fill("wrongpassword");
    await page.getByRole("button", { name: /iniciar sesión|login|entrar/i }).click();

    // Esperar mensaje de error (puede ser toast, alert, o texto en pantalla)
    // Ajustar el selector según la implementación real
    await expect(
      page.getByText(/credenciales|inválid|incorrect|error/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("redirige al dashboard con credenciales correctas", async ({ page }) => {
    const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@taskflow.ai";
    const TEST_USER_PASSWORD =
      process.env.TEST_USER_PASSWORD || "testpassword123";

    await page.goto("/login");

    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
    await page.getByLabel(/password|contraseña/i).fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión|login|entrar/i }).click();

    // Esperar redirección al dashboard
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});

test.describe("Auth Guard", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Sin autenticación

  test("el dashboard redirige a login cuando no está autenticado", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Debe redirigir a login
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});
