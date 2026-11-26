import { expect, test } from "@playwright/test";

// CI runs without DATABASE_URL, so the page explains that profiles need a database.
test("profile page explains the database requirement without DATABASE_URL", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("DATABASE_URL");
});

test("header links to the profile page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
