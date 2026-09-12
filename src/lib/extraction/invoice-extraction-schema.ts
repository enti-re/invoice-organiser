import { z } from "zod";

// Nullable fields reflect reality — not every invoice has every value, and
// a bad scan shouldn't force the model to hallucinate one.
export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  amount: z.number(),
});

// Single source of truth for reviewed fields, shared with confidence.ts
// so this enum and the confidence map can't drift apart.
export const EXTRACTION_FIELD_KEYS = [
  "vendor_name",
  "invoice_number",
  "invoice_date",
  "due_date",
  "currency",
  "subtotal_amount",
  "tax_amount",
  "total_amount",
  "line_items",
] as const;

export const uncertainFieldSchema = z.object({
  field: z.enum(EXTRACTION_FIELD_KEYS),
  reason: z
    .string()
    .describe(
      "Brief, specific explanation of the ambiguity or illegibility, e.g. \"Could be Jan 3 or Mar 1 — date format on the document is ambiguous\"",
    ),
});

export const invoiceExtractionSchema = z.object({
  is_invoice: z
    .boolean()
    .describe(
      "Whether this document actually is an invoice, receipt, bill, or similar billing document. False for anything else (a resume, a letter, an ID, a random photo, etc.) — even if you can still extract some invoice-shaped fields from it.",
    ),
  not_invoice_reason: z
    .string()
    .nullable()
    .describe(
      "If is_invoice is false, briefly say what the document actually appears to be, e.g. \"This looks like a resume, not an invoice.\" Null if is_invoice is true.",
    ),
  vendor_name: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable().describe("ISO 8601 date, YYYY-MM-DD, if determinable"),
  due_date: z.string().nullable().describe("ISO 8601 date, YYYY-MM-DD, if determinable"),
  currency: z.string().nullable().describe("ISO 4217 currency code, e.g. USD, INR, EUR"),
  subtotal_amount: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
  line_items: z.array(lineItemSchema),
  uncertain_fields: z
    .array(uncertainFieldSchema)
    .default([])
    .describe(
      "Fields you filled with a best guess despite genuine ambiguity (2-3 plausible readings), or null fields where the reason is informative (e.g. a due date genuinely absent from the document vs. illegible). Do not list a field here purely because you're fully confident in it — this is only for cases worth a human double-checking.",
    ),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
