import type { ConfidenceMap } from "@/db/schema";
import type { InvoiceExtraction } from "@/lib/invoice-extraction-schema";

/**
 * STUB — Session 1 placeholder only.
 *
 * The real confidence-scoring pass (independent second extraction / sanity
 * rules for date validity, amount-vs-line-items plausibility, non-empty
 * vendor, etc.) is the core "hard part" of this project and is built out in
 * Session 2. This stub exists purely so the schema, storage, and list UI
 * have a stable shape to work against — it always reports full confidence
 * and never flags anything. Do not treat its output as meaningful yet.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- param is unused until Session 2's real scoring logic
export function computeConfidence(extraction: InvoiceExtraction): {
  confidence: ConfidenceMap;
  needsReview: boolean;
} {
  const fields: (keyof InvoiceExtraction)[] = [
    "vendor_name",
    "invoice_date",
    "total_amount",
    "tax_amount",
    "line_items",
  ];

  const confidence: ConfidenceMap = {};
  for (const field of fields) {
    confidence[field] = {
      score: 1,
      flagged: false,
      reason: "not yet computed — confidence scoring lands in Session 2",
    };
  }

  return { confidence, needsReview: false };
}
