import { test, expect } from "@playwright/test";

test("homepage redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
