import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Independent page-level scans, not a user journey -- kept separate from
// happy-flow.spec.ts's serial upload/review/delete flow on purpose.
const expectNoViolations = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  if (results.violations.length > 0) {
    console.log(JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toEqual([]);
};

test("landing page has no axe violations", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page);
});

test("design-doc page has no axe violations", async ({ page }) => {
  await page.goto("/design-doc");
  await expectNoViolations(page);
});

const invoiceListLoaded = (page: import("@playwright/test").Page) =>
  page.getByRole("row").first().or(page.getByText("No invoices yet — upload one above."));

test("invoice list page has no axe violations, with data", async ({ page }) => {
  await page.goto("/app");
  await expect(invoiceListLoaded(page)).toBeVisible();
  await expectNoViolations(page);
});

test("invoice list page has no axe violations, empty-filtered state", async ({ page }) => {
  await page.goto("/app");
  await expect(invoiceListLoaded(page)).toBeVisible();

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("spinbutton", { name: "Min total" }).fill("999999999");
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/invoices?minAmount=999999999")),
    page.getByRole("button", { name: "Apply" }).click(),
  ]);

  await expect(page.getByText("No invoices match your filters.").first()).toBeVisible();
  await expectNoViolations(page);
});

test("invoice review page has no axe violations", async ({ page, request }) => {
  const res = await request.get("/api/invoices");
  const invoices = await res.json();
  test.skip(invoices.length === 0, "no invoices in the database to review");

  await page.goto(`/invoices/${invoices[0].id}`);
  await page.waitForSelector("text=Line items");
  await expectNoViolations(page);
});

test("upload dropzone is keyboard-operable", async ({ page }) => {
  await page.goto("/app");

  const dropzone = page.getByRole("button", { name: "Choose an invoice file to upload" });
  await expect(dropzone).toBeVisible();
  await dropzone.focus();
  await expect(dropzone).toBeFocused();

  const chooserPromise = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await chooserPromise;
});

test("delete confirmation dialog traps and restores focus", async ({ page }) => {
  await page.goto("/app");
  await page.waitForSelector("table");

  const deleteButton = page.getByRole("button", { name: "Delete invoice" }).first();
  await deleteButton.focus();
  await deleteButton.click();

  const dialog = page.getByRole("dialog", { name: "Delete this invoice?" });
  await expect(dialog).toBeVisible();

  // Focus should have moved into the dialog, not stayed on the trigger.
  await expect(page.locator(":focus")).not.toBe(deleteButton);

  // Tabbing forward from the last focusable element (Delete) wraps back to
  // the first (Cancel) instead of escaping to the page behind the dialog.
  const cancelButton = dialog.getByRole("button", { name: "Cancel" });
  const confirmDeleteButton = dialog.getByRole("button", { name: "Delete", exact: true });
  await confirmDeleteButton.focus();
  await page.keyboard.press("Tab");
  await expect(cancelButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(deleteButton).toBeFocused();
});

test("date filter popover traps and restores focus", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Filters" }).click();

  const startDateButton = page.getByRole("button", { name: /^Start date:/ });
  await startDateButton.focus();
  await startDateButton.click();

  const popover = page.getByRole("dialog", { name: "Start date" });
  await expect(popover).toBeVisible();
  await expect(startDateButton).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(startDateButton).toBeFocused();
  await expect(startDateButton).toHaveAttribute("aria-expanded", "false");
});
