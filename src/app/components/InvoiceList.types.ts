import type { ConfidenceMap, LineItem } from "@/db/schema";

export type { LineItem };

// The API's JSON response shape for one row (camelCase, stringified
// numeric columns) -- see InvoiceReview.types.ts for the same pattern.
export type InvoiceRow = {
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
  confidence: ConfidenceMap | null;
  needsReview: boolean;
};

export type Filters = {
  vendor: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
};

export const EMPTY_FILTERS: Filters = { vendor: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "" };

export type SortKey = "vendorName" | "invoiceDate" | "totalAmount";
export type SortDirection = "asc" | "desc";
