import { expect, test } from "@playwright/test";

test("profile tabs lead to the preferences page", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "About you" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/preferences$/);
  await expect(
    page.getByRole("link", { name: "Preferences", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  // CI runs without DATABASE_URL.
  await expect(page.getByRole("status")).toContainText("DATABASE_URL");
});
