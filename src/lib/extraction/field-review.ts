import type { ConfidenceMap } from "@/db/schema";

// Matches the API's EDITABLE_FIELD_COLUMNS -- line_items is confirmable
// but not directly editable, same as the backend.
export const EDITABLE_FIELDS = new Set([
  "vendor_name",
  "invoice_number",
  "invoice_date",
  "due_date",
  "currency",
  "subtotal_amount",
  "tax_amount",
  "total_amount",
]);

export const fieldState = (confidence: ConfidenceMap | null, key: string, hasValue: boolean) => {
  const fc = confidence?.[key];
  const flagged = fc?.flagged ?? false;
  return { flagged, missing: flagged && !hasValue, reason: fc?.reason };
};
