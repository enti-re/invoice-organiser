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
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
