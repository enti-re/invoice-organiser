import { describe, expect, it } from "vitest";

import { computeConfidence } from "../confidence";
import { EXTRACTION_FIELD_KEYS, type InvoiceExtraction } from "../invoice-extraction-schema";

const cleanInvoice: InvoiceExtraction = {
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
  uncertain_fields: [],
};

describe("computeConfidence", () => {
  it("flags nothing on a clean, internally consistent invoice", () => {
    const { confidence, needsReview } = computeConfidence(cleanInvoice);

    expect(needsReview).toBe(false);
    for (const field of Object.values(confidence)) {
      expect(field.flagged).toBe(false);
      expect(field.score).toBe(1);
    }
  });

  it("flags document_type and forces needsReview when the document isn't an invoice at all", () => {
    const { confidence, needsReview } = computeConfidence({
      ...cleanInvoice,
      is_invoice: false,
      not_invoice_reason: "This looks like a resume, not an invoice.",
      vendor_name: null,
      invoice_number: null,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: null,
      line_items: [],
    });

    expect(needsReview).toBe(true);
    expect(confidence.document_type).toMatchObject({ flagged: true, score: 0 });
    expect(confidence.document_type.reason).toBe("This looks like a resume, not an invoice.");
  });

  it("flags document_type even when the model coincidentally produced clean, self-consistent fields", () => {
    // The scenario the field-level checks alone would miss: a non-invoice
    // document that happens to yield internally consistent field values.
    const { confidence, needsReview } = computeConfidence({
      ...cleanInvoice,
      is_invoice: false,
      not_invoice_reason: "This looks like a wedding invitation, not an invoice.",
    });

    expect(needsReview).toBe(true);
    expect(confidence.document_type.flagged).toBe(true);
    for (const field of EXTRACTION_FIELD_KEYS) {
      expect(confidence[field].flagged).toBe(false);
    }
  });

  it("flags a null vendor_name with the empty/missing state (no value, flagged)", () => {
    const { confidence, needsReview } = computeConfidence({
      ...cleanInvoice,
      vendor_name: null,
    });

    expect(needsReview).toBe(true);
    expect(confidence.vendor_name).toMatchObject({ flagged: true, score: 0 });
    expect(confidence.vendor_name.reason).toContain("Unable to extract");
  });

  it("flags a placeholder-looking vendor_name even though it has a value", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      vendor_name: "N/A",
    });

    expect(confidence.vendor_name.flagged).toBe(true);
    expect(confidence.vendor_name.score).toBe(0.5);
    expect(confidence.vendor_name.reason).toContain("placeholder");
  });

  it("flags total_amount and line_items when the line-item sum doesn't match the total (no subtotal breakdown)", () => {
    const { confidence, needsReview } = computeConfidence({
      ...cleanInvoice,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: 999,
    });

    expect(needsReview).toBe(true);
    expect(confidence.total_amount.flagged).toBe(true);
    expect(confidence.total_amount.reason).toContain("does not match");
    expect(confidence.line_items.flagged).toBe(true);
  });

  it("flags subtotal_amount and line_items when line items don't sum to the subtotal", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      subtotal_amount: 500,
    });

    expect(confidence.subtotal_amount.flagged).toBe(true);
    expect(confidence.line_items.flagged).toBe(true);
  });

  it("flags subtotal/tax/total when subtotal + tax doesn't add up to total", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      subtotal_amount: 100,
      tax_amount: 10,
      total_amount: 150,
      line_items: [{ description: "Widget", quantity: 3, unit_price: 50, amount: 150 }],
    });

    expect(confidence.subtotal_amount.flagged).toBe(true);
    expect(confidence.tax_amount.flagged).toBe(true);
    expect(confidence.total_amount.flagged).toBe(true);
  });

  it("tolerates small rounding differences in amount math", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      subtotal_amount: 100,
      tax_amount: 10,
      total_amount: 110.01,
    });

    expect(confidence.total_amount.flagged).toBe(false);
  });

  it("flags an invalid invoice_date format", () => {
    const { confidence, needsReview } = computeConfidence({
      ...cleanInvoice,
      invoice_date: "15/01/2026",
    });

    expect(needsReview).toBe(true);
    expect(confidence.invoice_date.flagged).toBe(true);
    expect(confidence.invoice_date.score).toBe(0.5);
    expect(confidence.invoice_date.reason).toContain("Invalid or unparseable date");
  });

  it("rejects a calendar-invalid date even in the right format", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      invoice_date: "2026-02-30",
    });

    expect(confidence.invoice_date.flagged).toBe(true);
  });

  it("folds a model self-reported ambiguity into the confidence map for a field with a value", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      invoice_date: "2026-03-01",
      uncertain_fields: [
        { field: "invoice_date", reason: "Could be Jan 3 or Mar 1 — date format on the document is ambiguous" },
      ],
    });

    expect(confidence.invoice_date.flagged).toBe(true);
    expect(confidence.invoice_date.score).toBe(0.5);
    expect(confidence.invoice_date.reason).toContain("ambiguous");
  });

  it("prefers the model's specific reason over the generic one for a self-explained null field", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      due_date: null,
      uncertain_fields: [{ field: "due_date", reason: "No due date is printed on this document" }],
    });

    expect(confidence.due_date.flagged).toBe(true);
    expect(confidence.due_date.score).toBe(0);
    expect(confidence.due_date.reason).toBe("No due date is printed on this document");
  });

  it("flags line_items when a total is present but no line items were extracted", () => {
    const { confidence } = computeConfidence({
      ...cleanInvoice,
      line_items: [],
    });

    expect(confidence.line_items.flagged).toBe(true);
  });

  it("handles a deliberately messy, almost-entirely-null invoice without throwing", () => {
    const messyInvoice: InvoiceExtraction = {
      is_invoice: true,
      not_invoice_reason: null,
      vendor_name: null,
      invoice_number: null,
      invoice_date: "not a date",
      due_date: null,
      currency: null,
      subtotal_amount: null,
      tax_amount: null,
      total_amount: null,
      line_items: [],
      uncertain_fields: [{ field: "invoice_date", reason: "Handwriting is nearly illegible" }],
    };

    expect(() => computeConfidence(messyInvoice)).not.toThrow();

    const { confidence, needsReview } = computeConfidence(messyInvoice);

    expect(needsReview).toBe(true);
    expect(confidence.vendor_name).toMatchObject({ flagged: true, score: 0 });
    expect(confidence.invoice_number).toMatchObject({ flagged: true, score: 0 });
    expect(confidence.currency).toMatchObject({ flagged: true, score: 0 });
    expect(confidence.line_items.flagged).toBe(false); // no total_amount to compare against, so no math check fires
    expect(confidence.invoice_date.flagged).toBe(true);
    expect(confidence.invoice_date.reason).toContain("illegible");
  });
});
