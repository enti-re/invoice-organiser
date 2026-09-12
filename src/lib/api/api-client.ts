import type { Filters, InvoiceRow } from "@/app/components/invoice-list/InvoiceList.types";
import type { InvoiceData } from "@/app/components/invoice-review/InvoiceReview.types";

const parseJsonOrThrow = async <T>(res: Response, fallbackMessage: string): Promise<T> => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `${fallbackMessage} (${res.status})`);
  }
  return res.json();
};

export const listInvoices = async (filters: Filters): Promise<InvoiceRow[]> => {
  const params = new URLSearchParams();
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

  const res = await fetch(`/api/invoices?${params.toString()}`);
  return res.json();
};

export const uploadInvoice = async (file: File): Promise<InvoiceRow> => {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/invoices", { method: "POST", body });
  return parseJsonOrThrow<InvoiceRow>(res, "Upload failed");
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
  await parseJsonOrThrow(res, "Delete failed");
};

export const getInvoice = async (id: string): Promise<InvoiceData> => {
  const res = await fetch(`/api/invoices/${id}`);
  return parseJsonOrThrow<InvoiceData>(res, "Failed to load invoice");
};

export const updateInvoiceField = async (
  id: string,
  field: string,
  action: "confirm" | "correct",
  value?: string,
): Promise<InvoiceData> => {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, action, value }),
  });
  return parseJsonOrThrow<InvoiceData>(res, "Update failed");
};
