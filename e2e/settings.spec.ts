import { expect, test } from "@playwright/test";

test("saving a key in Settings enables Analyze", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Model")).toHaveValue("claude-haiku-5-5");

  await page.getByLabel("Anthropic API key").fill("sk-ant-test");
  await expect(page.getByRole("status")).toContainText("Ready to analyze");

  await page.getByRole("link", { name: "Go to Analyze" }).click();
  await page.getByLabel("Sample postings").selectOption({ index: 1 });
  await expect(
    page.getByRole("button", { name: "Extract requirements" }),
  ).toBeEnabled();
});

test("Clear key removes the key", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Anthropic API key").fill("sk-ant-test");
  await page.getByRole("button", { name: "Clear key" }).click();
  await expect(page.getByLabel("Anthropic API key")).toHaveValue("");
  await expect(page.getByRole("status")).toContainText("Add a model and a key");
});
