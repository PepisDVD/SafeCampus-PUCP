import { expect, test } from "@playwright/test";

test("dashboard Lost & Found permite filtrar y navegar a logística", async ({ page }) => {
  await page.goto("/lost-found-operaciones");
  test.skip(page.url().includes("/login"), "Requiere una sesión operativa para validar el dashboard.");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Casos totales")).toBeVisible();
  await expect(page.getByText("Casos registrados vs devueltos")).toBeVisible();
  await expect(page.getByText("Hilos encontrados vs perdidos")).toBeVisible();
  await expect(page.getByText("Actividad reciente")).toBeVisible();

  const dashboardRequest = page.waitForResponse((response) =>
    response.url().includes("/lost-found/dashboard") && response.request().method() === "GET",
  );
  await page.getByRole("combobox", { name: "Tipo" }).click();
  await page.getByRole("option", { name: "Encontrado" }).click();
  await dashboardRequest;

  await page.getByRole("link", { name: "Ver todo" }).last().click();
  await expect(page).toHaveURL(/\/lost-found-logistica/);
});
