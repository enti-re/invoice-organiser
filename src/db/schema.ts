import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type LineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
};

export type FieldConfidence = {
  score: number; // 0-1
  flagged: boolean;
  reason: string;
};

export type ConfidenceMap = Record<string, FieldConfidence>;

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  // Original file
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),

  // Extracted fields (strict, typed columns — these are the ones we filter/sort/search on)
  vendorName: text("vendor_name"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"), // stored as ISO date string (YYYY-MM-DD); see decisions.md
  dueDate: text("due_date"),
  currency: text("currency"),
  subtotalAmount: numeric("subtotal_amount"),
  taxAmount: numeric("tax_amount"),
  totalAmount: numeric("total_amount"),

  // Naturally variable-shaped data — jsonb by design, see decisions.md
  lineItems: jsonb("line_items").$type<LineItem[]>(),
  confidence: jsonb("confidence").$type<ConfidenceMap>(),

  // Derived: true if any field in `confidence` is flagged
  needsReview: boolean("needs_review").default(false).notNull(),

  // Full raw model response, kept for audit/debugging — never shown directly in the UI
  rawExtraction: jsonb("raw_extraction"),
  extractionModel: text("extraction_model"),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
