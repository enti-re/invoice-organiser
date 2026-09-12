import { describe, expect, it } from "vitest";

import type { InvoiceRow } from "@/app/components/invoice-list/InvoiceList.types";
import { ACCEPTED_FILE_TYPES, compareInvoices, formatINR, validateFile } from "../invoice-list";

const makeInvoice = (overrides: Partial<InvoiceRow> = {}): InvoiceRow => ({
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  fileName: "invoice.pdf",
  fileUrl: "https://example.com/invoice.pdf",
  vendorName: "Acme Corp",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-01-15",
  dueDate: "2026-02-15",
  currency: "INR",
  subtotalAmount: "100",
  taxAmount: "10",
  totalAmount: "110",
  lineItems: [],
  confidence: null,
  needsReview: false,
  ...overrides,
});

describe("formatINR", () => {
  it("formats a numeric string with the rupee symbol and two decimals", () => {
    expect(formatINR("1234.5")).toBe("₹1,234.50");
  });

  it("returns an em dash for null", () => {
    expect(formatINR(null)).toBe("—");
  });

  it("returns an em dash for a non-numeric string", () => {
    expect(formatINR("not a number")).toBe("—");
  });
});

describe("compareInvoices", () => {
  it("compares by vendorName alphabetically", () => {
    const a = makeInvoice({ vendorName: "Zeta" });
    const b = makeInvoice({ vendorName: "Acme" });
    expect(compareInvoices(a, b, "vendorName")).toBeGreaterThan(0);
    expect(compareInvoices(b, a, "vendorName")).toBeLessThan(0);
  });

  it("treats a null vendorName as an empty string", () => {
    const a = makeInvoice({ vendorName: null });
    const b = makeInvoice({ vendorName: "Acme" });
    expect(compareInvoices(a, b, "vendorName")).toBeLessThan(0);
  });

  it("compares by invoiceDate lexically", () => {
    const a = makeInvoice({ invoiceDate: "2026-02-01" });
    const b = makeInvoice({ invoiceDate: "2026-01-01" });
    expect(compareInvoices(a, b, "invoiceDate")).toBeGreaterThan(0);
  });

  it("compares by totalAmount numerically", () => {
    const a = makeInvoice({ totalAmount: "500" });
    const b = makeInvoice({ totalAmount: "50" });
    expect(compareInvoices(a, b, "totalAmount")).toBeGreaterThan(0);
  });

  it("treats a null totalAmount as the smallest value", () => {
    const a = makeInvoice({ totalAmount: null });
    const b = makeInvoice({ totalAmount: "1" });
    expect(compareInvoices(a, b, "totalAmount")).toBeLessThan(0);
  });
});

describe("validateFile", () => {
  it("accepts every type in ACCEPTED_FILE_TYPES", () => {
    for (const type of ACCEPTED_FILE_TYPES) {
      const file = new File(["content"], "invoice", { type });
      expect(validateFile(file)).toBeNull();
    }
  });

  it("rejects an unsupported file type", () => {
    const file = new File(["content"], "invoice.txt", { type: "text/plain" });
    expect(validateFile(file)).toBe("Unsupported file type — upload a PDF, PNG, JPEG, or WEBP.");
  });

  it("rejects a file over the size limit", () => {
    const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 20 * 1024 * 1024 });
    expect(validateFile(file)).toBe("File is too large — max size is 15MB.");
  });
});
