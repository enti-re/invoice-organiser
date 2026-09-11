import { z } from "zod";

/**
 * Shape of a single extraction pass. Nullable fields reflect reality: not
 * every invoice has every field, and a bad/blurry scan shouldn't force the
 * model to hallucinate a value just to satisfy the schema.
 */
export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  amount: z.number(),
});

// Single source of truth for which top-level fields the confidence layer
// reviews — shared with confidence.ts so the `uncertain_fields` enum below
// and the confidence map it produces can never drift apart.
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
