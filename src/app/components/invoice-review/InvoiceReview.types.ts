import type { ConfidenceMap, LineItem } from "@/db/schema";

export type { ConfidenceMap, LineItem };

// The API's JSON response shape -- camelCase keys and stringified numeric
// columns (as Postgres's driver returns them), unlike the DB row itself.
export type InvoiceData = {
  id: string;
  createdAt: string;
  fileName: string;
  fileUrl: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string | null;
  subtotalAmount: string | null;
  taxAmount: string | null;
  totalAmount: string | null;
  lineItems: LineItem[] | null;
  needsReview: boolean;
  confidence: ConfidenceMap | null;
};
