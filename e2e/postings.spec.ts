import { expect, test } from "@playwright/test";

// CI runs without DATABASE_URL, so the list explains that it needs a database.
test("postings page explains the database requirement without DATABASE_URL", async ({
  page,
}) => {
  await page.goto("/postings");
  await expect(
    page.getByRole("heading", { name: "Postings", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("DATABASE_URL");
});

test("header links to the postings page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Postings", exact: true }).click();
  await expect(page).toHaveURL(/\/postings$/);
});
