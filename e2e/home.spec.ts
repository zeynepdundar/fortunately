import { expect, test } from "@playwright/test";

test("home shows the tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Fortunately",
  );
});

test("home explains how it works and links to the repo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/zeynepdundar/fortunately");
});

test("home links every sample to its precomputed result", async ({ page }) => {
  await page.goto("/");
  const samples = page.locator('a[href^="/samples/"]');
  const count = await samples.count();
  test.skip(count === 0, "no precomputed samples committed yet");
  await samples.first().click();
  await expect(
    page.getByText("Sample · fictional posting and CV"),
  ).toBeVisible();
  await expect(page.getByTestId("must-met")).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ ok: true });
});
