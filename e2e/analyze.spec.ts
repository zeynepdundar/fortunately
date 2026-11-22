import { expect, test } from "@playwright/test";

test("a sample fills the posting box and the page asks for a key", async ({
  page,
}) => {
  await page.goto("/analyze");
  await expect(
    page.getByRole("heading", { name: "Analyze a posting" }),
  ).toBeVisible();

  await page.getByLabel("Sample postings").selectOption({ index: 1 });
  await expect(page.getByLabel("Job posting")).toHaveValue(
    /Senior Frontend Engineer/,
  );

  // Next.js adds its own empty role="alert" route announcer, so match ours by text.
  await expect(
    page.getByRole("alert").filter({ hasText: "Settings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Extract requirements" }),
  ).toBeDisabled();
});
