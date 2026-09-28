import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * #547 — login/register previously stayed hardcoded English even after
 * switching locale on settings. Confirms the selected locale actually
 * reaches the auth screens.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Locale persists onto the login and register screens", () => {
  test("switching to Español on settings renders /login and /register in Spanish", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);
    await page.goto("/setting");

    await page.getByRole("button", { name: "English" }).click();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(page.getByRole("button", { name: "Español" })).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("Introduce tus credenciales para continuar.")).toBeVisible();
    await expect(page.getByText("Correo electrónico")).toBeVisible();
    await expect(page.getByText("Contraseña", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("¿No tienes cuenta?")).toBeVisible();

    await page.getByRole("link", { name: "Registrarse" }).click();
    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
    await expect(
      page.getByText("Regístrate para acceder a la plataforma ApexChain."),
    ).toBeVisible();
    await expect(page.getByText("Confirmar contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByText("¿Ya tienes una cuenta?")).toBeVisible();
  });
});
