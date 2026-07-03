import { expect, test } from "@playwright/test";

test("logistica permite exportar PDF para una custodia devuelta", async ({ page }) => {
  await page.goto("/lost-found-logistica");
  test.skip(page.url().includes("/login"), "Requiere una sesion operativa para validar logistica.");

  await expect(page.getByRole("heading", { name: /Log.stica/ })).toBeVisible();

  await page.getByRole("button", { name: "Todos los estados" }).click();
  await page.getByRole("button", { name: /Limpiar selecci.n/ }).click();
  await page.getByRole("option", { name: "Devuelta" }).click();

  const custodyRequest = page.waitForResponse((response) =>
    response.url().includes("/lost-found/custodias") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await custodyRequest;

  const returnedRow = page.locator("tbody tr").filter({ hasText: "Devuelta" }).first();
  test.skip(await returnedRow.count() === 0, "No hay custodias devueltas disponibles para exportar.");

  await returnedRow.getByRole("button", { name: /Acciones para/ }).click();
  await expect(page.getByRole("menuitem", { name: "Exportar PDF" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportar PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^devolucion-.+\.pdf$/);
});
