import path from "node:path";
import { expect, test } from "@playwright/test";

// One serial flow, one real invoice: upload -> extract (real Gemini call) ->
// review -> resolve a flag if present -> delete. Serial so every step shares
// the single uploaded invoice instead of each test re-uploading (and paying
// for another real extraction call).
test.describe.serial("invoice happy flow", () => {
  test("landing page links into the app", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /open the app|invoice organiser|app/i }).first().click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("uploads a real invoice and sees it extracted", async ({ page }) => {
    await page.goto("/app");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/sample-invoice.png"));

    await page.getByRole("button", { name: "Upload & extract" }).click();

    // Real Gemini extraction call — genuinely slow, give it real headroom.
    // The mobile card layout renders the same vendor name off-screen at
    // desktop width, so scope to the (visible) table cell specifically.
    await expect(page.getByRole("cell", { name: "Acme Supplies Inc." })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("opens the review page and shows extracted line items", async ({ page }) => {
    await page.goto("/app");
    await page
      .getByRole("row")
      .filter({ hasText: "Acme Supplies Inc." })
      .getByRole("button", { name: "Review" })
      .click();

    await expect(page).toHaveURL(/\/invoices\//);
    await expect(page.getByText("Line items")).toBeVisible();
    await expect(page.getByText(/Office chairs/i)).toBeVisible();
    await expect(page.getByText(/Standing desks/i)).toBeVisible();
  });

  test("resolves a flagged field if the extraction raised one", async ({ page }) => {
    const flagButtons = page.getByRole("button", { name: "Needs review" });
    const flagCount = await flagButtons.count();

    if (flagCount === 0) {
      test.info().annotations.push({
        type: "note",
        description: "Clean extraction — nothing flagged, nothing to confirm.",
      });
      return;
    }

    await flagButtons.first().click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("button", { name: "Saving…" })).toHaveCount(0);

    await expect(flagButtons).toHaveCount(flagCount - 1);
  });

  test("deletes the invoice from the list", async ({ page }) => {
    await page.goto("/app");

    const row = page.getByRole("row").filter({ hasText: "Acme Supplies Inc." });
    await row.getByRole("button", { name: "Delete invoice" }).click();

    await expect(page.getByText("Delete this invoice?")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("Acme Supplies Inc.")).toHaveCount(0);
  });
});
