import type { InvoiceRow, SortKey } from "@/app/components/invoice-list/InvoiceList.types";

export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
// Vercel's serverless function request body limit sits around 4.5MB in
// production, hit before our own code runs — confirmed by testing real
// uploads against it. Capped below that so we reject with our own message
// instead of a raw platform 413.
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

// INR-only by scope, not oversight -- multi-currency is a future extension.
export const formatINR = (amount: string | null): string => {
  if (amount == null) return "—";
  const value = Number(amount);
  if (Number.isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const compareInvoices = (a: InvoiceRow, b: InvoiceRow, key: SortKey): number => {
  if (key === "vendorName") {
    return (a.vendorName ?? "").localeCompare(b.vendorName ?? "");
  }
  if (key === "invoiceDate") {
    return (a.invoiceDate ?? "").localeCompare(b.invoiceDate ?? "");
  }
  const av = a.totalAmount != null ? Number(a.totalAmount) : -Infinity;
  const bv = b.totalAmount != null ? Number(b.totalAmount) : -Infinity;
  return av - bv;
};

export const validateFile = (file: File): string | null => {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return "Unsupported file type — upload a PDF, PNG, JPEG, or WEBP.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Maximum allowed size is 4MB.";
  }
  return null;
};
