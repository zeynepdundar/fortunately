import { expect, test } from "@playwright/test";

test("insights page explains the database requirement without DATABASE_URL", async ({
  page,
}) => {
  await page.goto("/insights");
  await expect(
    page.getByRole("heading", { name: "Insights", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("DATABASE_URL");
});

test("header links to the insights page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await expect(page).toHaveURL(/\/insights$/);
});
