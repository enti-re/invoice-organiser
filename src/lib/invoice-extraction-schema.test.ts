import { describe, expect, it } from "vitest";

import { invoiceExtractionSchema } from "./invoice-extraction-schema";

describe("invoiceExtractionSchema", () => {
  it("accepts a well-formed extraction", () => {
    const result = invoiceExtractionSchema.safeParse({
      is_invoice: true,
      not_invoice_reason: null,
      vendor_name: "Acme Corp",
      invoice_number: "INV-1001",
      invoice_date: "2026-01-15",
      due_date: "2026-02-14",
      currency: "USD",
      subtotal_amount: 100,
      tax_amount: 10,
      total_amount: 110,
      line_items: [{ description: "Widget", quantity: 2, unit_price: 50, amount: 100 }],
    });
    expect(result.success).toBe(true);
  });

  it("allows null fields the model couldn't determine", () => {
    const result = invoiceExtractionSchema.safeParse({
      is_invoice: true,
      not_invoice_reason: null,
      vendor_name: null,
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      currency: null,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: null,
      line_items: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a line item missing a required field", () => {
    const result = invoiceExtractionSchema.safeParse({
      is_invoice: true,
      not_invoice_reason: null,
      vendor_name: "Acme Corp",
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      currency: "USD",
      subtotal_amount: null,
      tax_amount: null,
      total_amount: 110,
      line_items: [{ description: "Widget", quantity: 2, unit_price: 50 /* missing amount */ }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a not-an-invoice extraction with a reason", () => {
    const result = invoiceExtractionSchema.safeParse({
      is_invoice: false,
      not_invoice_reason: "This looks like a resume, not an invoice.",
      vendor_name: null,
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      currency: null,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: null,
      line_items: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an extraction missing is_invoice", () => {
    const result = invoiceExtractionSchema.safeParse({
      not_invoice_reason: null,
      vendor_name: "Acme Corp",
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      currency: null,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: null,
      line_items: [],
    });
    expect(result.success).toBe(false);
  });
});
