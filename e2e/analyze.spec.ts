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

  await expect(page.getByRole("alert")).toContainText("Settings");
  await expect(
    page.getByRole("button", { name: "Extract requirements" }),
  ).toBeDisabled();
});
