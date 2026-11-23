import { expect, test } from "@playwright/test";

test("saving a key in Settings enables Analyze", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Model", { exact: true })).toHaveValue(
    "claude-haiku-5-5",
  );

  await page
    .getByLabel("Anthropic API key", { exact: true })
    .fill("sk-ant-test");
  await expect(page.getByRole("status")).toContainText("Ready to analyze");

  await page.getByRole("link", { name: "Go to Analyze" }).click();
  await page.getByLabel("Sample postings").selectOption({ index: 1 });
  await expect(
    page.getByRole("button", { name: "Extract requirements" }),
  ).toBeEnabled();
});

test("Clear key removes the key", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByLabel("Anthropic API key", { exact: true })
    .fill("sk-ant-test");
  await page.getByRole("button", { name: "Clear key" }).click();
  await expect(
    page.getByLabel("Anthropic API key", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("status")).toContainText("Add a model and a key");
});

test("Ollama needs no key", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Ollama (local)", { exact: true }).check();
  await expect(page.getByLabel("Model", { exact: true })).toHaveValue(
    "qwen3:8b",
  );
  await expect(page.getByRole("status")).toContainText("Ready to analyze");
  await expect(
    page.getByLabel("Thinking mode", { exact: true }),
  ).not.toBeChecked();

  await page.getByLabel("Model", { exact: true }).fill("llama3.1:8b");
  await expect(page.getByLabel("Thinking mode", { exact: true })).toHaveCount(
    0,
  );
});
