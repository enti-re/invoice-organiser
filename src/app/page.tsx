"use client";

import { useCallback, useEffect, useState } from "react";

type LineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
};

type InvoiceRow = {
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
};

type Filters = {
  vendor: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
};

const EMPTY_FILTERS: Filters = { vendor: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "" };

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (f: Filters) => {
    const params = new URLSearchParams();
    if (f.vendor) params.set("vendor", f.vendor);
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    if (f.minAmount) params.set("minAmount", f.minAmount);
    if (f.maxAmount) params.set("maxAmount", f.maxAmount);

    try {
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      setInvoices(data);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/invoices", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      form.reset();
      setLoadingList(true);
      await fetchInvoices(filters);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoadingList(true);
    fetchInvoices(filters);
  }

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Invoice Extraction</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a vendor invoice or receipt (PDF, PNG, JPEG, WEBP). Fields are extracted
          automatically — flagged fields will need a human look once confidence scoring lands.
        </p>
      </header>

      <section className="border border-neutral-200 rounded-lg p-6 space-y-3">
        <h2 className="font-medium">Upload an invoice</h2>
        <form onSubmit={handleUpload} className="flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            required
            className="text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-black text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            {uploading ? "Extracting…" : "Upload & extract"}
          </button>
        </form>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Invoices</h2>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-2 text-sm">
          <input
            placeholder="Vendor contains…"
            value={filters.vendor}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
            className="border border-neutral-300 rounded px-2 py-1"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="border border-neutral-300 rounded px-2 py-1"
          />
          <span className="self-center text-neutral-400">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="border border-neutral-300 rounded px-2 py-1"
          />
          <input
            type="number"
            placeholder="Min amount"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            className="border border-neutral-300 rounded px-2 py-1 w-28"
          />
          <input
            type="number"
            placeholder="Max amount"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            className="border border-neutral-300 rounded px-2 py-1 w-28"
          />
          <button type="submit" className="border border-neutral-300 rounded px-3 py-1">
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              fetchInvoices(EMPTY_FILTERS);
            }}
            className="text-neutral-500 px-3 py-1"
          >
            Clear
          </button>
        </form>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-neutral-200 text-neutral-500">
              <th className="py-2 pr-4">Vendor</th>
              <th className="py-2 pr-4">Invoice date</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Tax</th>
              <th className="py-2 pr-4">Line items</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">File</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{inv.vendorName ?? "—"}</td>
                <td className="py-2 pr-4">{inv.invoiceDate ?? "—"}</td>
                <td className="py-2 pr-4">
                  {inv.totalAmount ? `${inv.currency ?? ""} ${inv.totalAmount}` : "—"}
                </td>
                <td className="py-2 pr-4">{inv.taxAmount ?? "—"}</td>
                <td className="py-2 pr-4">{inv.lineItems?.length ?? 0}</td>
                <td className="py-2 pr-4">
                  {inv.needsReview ? (
                    <span className="text-amber-600 font-medium">Needs review</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <a
                    href={inv.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    view
                  </a>
                </td>
              </tr>
            ))}
            {!loadingList && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-400">
                  No invoices yet — upload one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
