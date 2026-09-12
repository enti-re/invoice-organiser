import { invoices } from "@/db/schema";

// Maps a confidence field key to the Drizzle column it corrects.
// line_items is confirmable but not correctable here -- editing individual
// rows needs a different, more involved UI, out of scope for now.
export const EDITABLE_FIELD_COLUMNS = {
  vendor_name: invoices.vendorName,
  invoice_number: invoices.invoiceNumber,
  invoice_date: invoices.invoiceDate,
  due_date: invoices.dueDate,
  currency: invoices.currency,
  subtotal_amount: invoices.subtotalAmount,
  tax_amount: invoices.taxAmount,
  total_amount: invoices.totalAmount,
} as const;

export type EditableField = keyof typeof EDITABLE_FIELD_COLUMNS;

export const isEditableField = (field: unknown): field is EditableField => {
  return typeof field === "string" && field in EDITABLE_FIELD_COLUMNS;
};

const COLUMN_SETTERS: {
  [K in EditableField]: (value: string | null) => Partial<typeof invoices.$inferInsert>;
} = {
  vendor_name: (v) => ({ vendorName: v }),
  invoice_number: (v) => ({ invoiceNumber: v }),
  invoice_date: (v) => ({ invoiceDate: v }),
  due_date: (v) => ({ dueDate: v }),
  currency: (v) => ({ currency: v }),
  subtotal_amount: (v) => ({ subtotalAmount: v }),
  tax_amount: (v) => ({ taxAmount: v }),
  total_amount: (v) => ({ totalAmount: v }),
};

export const buildFieldUpdate = (
  field: EditableField,
  value: unknown,
): Partial<typeof invoices.$inferInsert> => {
  const stringValue = value === null || value === undefined ? null : String(value);
  return COLUMN_SETTERS[field](stringValue);
};
