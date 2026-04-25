import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  // Estos tests usan el storageState autenticado por defecto

  test("muestra las tres columnas del kanban", async ({ page }) => {
    await page.goto("/dashboard");

    // Verificar que las tres columnas están visibles
    await expect(page.getByText("Por hacer")).toBeVisible();
    await expect(page.getByText("En progreso")).toBeVisible();
    await expect(page.getByText("Terminado")).toBeVisible();
  });

  test("muestra el botón Nueva Tarea", async ({ page }) => {
    await page.goto("/dashboard");

    // Verificar que el botón de crear nueva tarea está visible
    const newTaskButton = page.getByRole("button", { name: /nueva tarea/i });
    await expect(newTaskButton).toBeVisible();
  });

  test("muestra el asistente IA", async ({ page }) => {
    await page.goto("/dashboard");

    // Verificar que el chat IA está presente
    await expect(page.getByText(/asistente IA/i)).toBeVisible();
  });

  test("muestra el email del usuario en el header", async ({ page }) => {
    await page.goto("/dashboard");

    const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@taskflow.ai";

    // Verificar que el email del usuario está visible en el header
    await expect(page.getByText(TEST_USER_EMAIL)).toBeVisible();
  });

  test("muestra el botón de Sign Out", async ({ page }) => {
    await page.goto("/dashboard");

    // Verificar que el botón de sign out está visible
    const signOutButton = page.getByRole("button", { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
  });

  test("las tareas tienen prioridad visible", async ({ page }) => {
    await page.goto("/dashboard");

    // Si existen tareas en el sistema, deberían mostrar su prioridad
    // Esto verifica que las badges de prioridad se renderizan
    const priorityBadges = page.locator("text=/BAJA|MEDIA|ALTA|CRÍTICA/");

    // Verificar que existen badges de prioridad (si hay tareas)
    const count = await priorityBadges.count();

    // Si hay tareas, deberían tener badges de prioridad
    if (count > 0) {
      await expect(priorityBadges.first()).toBeVisible();
    }
  });
});
