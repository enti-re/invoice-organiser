"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { InvoiceDetail } from "@/app/components/InvoiceDetail";

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

const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

type SortKey = "vendorName" | "invoiceDate" | "totalAmount";
type SortDirection = "asc" | "desc";

// INR-only: the extraction pipeline targets Indian vendor invoices for this assignment,
// so multi-currency formatting is explicitly out of scope rather than an oversight.
function formatINR(amount: string | null): string {
  if (amount == null) return "—";
  const value = Number(amount);
  if (Number.isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compareInvoices(a: InvoiceRow, b: InvoiceRow, key: SortKey): number {
  if (key === "vendorName") {
    return (a.vendorName ?? "").localeCompare(b.vendorName ?? "");
  }
  if (key === "invoiceDate") {
    return (a.invoiceDate ?? "").localeCompare(b.invoiceDate ?? "");
  }
  const av = a.totalAmount != null ? Number(a.totalAmount) : -Infinity;
  const bv = b.totalAmount != null ? Number(b.totalAmount) : -Infinity;
  return av - bv;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return "Unsupported file type — upload a PDF, PNG, JPEG, or WEBP.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large — max size is 15MB.";
  }
  return null;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

function StatusBadge({ needsReview }: { needsReview: boolean }) {
  // Row-level flag only — the backend doesn't expose per-field confidence yet,
  // so this approximates the "review flagged fields" UX with a single badge per invoice.
  if (needsReview) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
        Needs review
      </span>
    );
  }
  return <span className="text-xs text-neutral-400">Reviewed</span>;
}

function SortIndicator({ direction }: { direction: SortDirection }) {
  return <span className="text-amber-600">{direction === "asc" ? "▲" : "▼"}</span>;
}

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", selectedFile);
      const res = await fetch("/api/invoices", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  // Delete endpoint assumed as DELETE /api/invoices/{id} -> 200/204 on success,
  // being built in parallel; reconcile if the real contract differs.
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this invoice?")) return;

    setListError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const sortedInvoices = useMemo(() => {
    if (!sortKey) return invoices;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...invoices].sort((a, b) => compareInvoices(a, b, sortKey) * dir);
  }, [invoices, sortKey, sortDirection]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8 space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-black">Invoice Extraction</h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
          Upload a vendor invoice or receipt (PDF, PNG, JPEG, WEBP, up to 15MB). Fields are
          extracted automatically — rows flagged{" "}
          <span className="text-amber-600 font-medium">Needs review</span> are the ones worth a
          second look; everything else you can trust as-is.
        </p>
      </header>

      <section className="bg-white border border-neutral-200 rounded-xl p-6 space-y-3">
        <h2 className="font-bold text-black">Upload an invoice</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            onChange={handleFileChange}
            required
            className="text-sm text-neutral-600 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200"
          />
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="bg-black text-white text-sm px-5 py-2.5 rounded-full font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Extracting…" : "Upload & extract"}
          </button>
        </form>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="font-bold text-black">Invoices</h2>

        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2 text-sm bg-white border border-neutral-200 rounded-xl p-4"
        >
          <input
            placeholder="Vendor contains…"
            value={filters.vendor}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 font-mono text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
          />
          <span className="text-neutral-400">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 font-mono text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
          />
          <input
            type="number"
            placeholder="Min amount"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 w-28 font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
          />
          <input
            type="number"
            placeholder="Max amount"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 w-28 font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
          />
          <button
            type="submit"
            className="border border-neutral-300 rounded-full px-4 py-1.5 font-medium text-black hover:border-black"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              fetchInvoices(EMPTY_FILTERS);
            }}
            className="text-neutral-500 px-3 py-1.5 hover:text-black"
          >
            Clear
          </button>
        </form>

        {listError && <p className="text-sm text-red-600">{listError}</p>}

        {/* Desktop table */}
        <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-200 text-neutral-500 bg-neutral-50">
                <th className="py-3 pl-4 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("vendorName")}
                    className="flex items-center gap-1 font-medium text-neutral-500 hover:text-black"
                  >
                    Vendor
                    {sortKey === "vendorName" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("invoiceDate")}
                    className="flex items-center gap-1 font-medium text-neutral-500 hover:text-black"
                  >
                    Invoice date
                    {sortKey === "invoiceDate" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("totalAmount")}
                    className="flex items-center gap-1 font-medium text-neutral-500 hover:text-black"
                  >
                    Total
                    {sortKey === "totalAmount" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4 font-medium">Tax</th>
                <th className="py-3 pr-4 font-medium">Line items</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">File</th>
                <th className="py-3 pr-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer"
                >
                  <td className="py-3 pl-4 pr-4 text-black">{inv.vendorName ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono text-neutral-700">{inv.invoiceDate ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono text-black">{formatINR(inv.totalAmount)}</td>
                  <td className="py-3 pr-4 font-mono text-neutral-700">{formatINR(inv.taxAmount)}</td>
                  <td className="py-3 pr-4 text-neutral-700">{inv.lineItems?.length ?? 0}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge needsReview={inv.needsReview} />
                  </td>
                  <td className="py-3 pr-4">
                    <a
                      href={inv.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-amber-600 hover:underline"
                    >
                      view
                    </a>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      aria-label="Delete invoice"
                      disabled={deletingId === inv.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(inv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 disabled:opacity-40 transition-opacity"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingList && sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-neutral-400">
                    No invoices yet — upload one above.
                  </td>
                </tr>
              )}
              {loadingList && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-neutral-400">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {sortedInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className="relative bg-white border border-neutral-200 rounded-xl p-4 space-y-2 cursor-pointer"
            >
              <button
                type="button"
                aria-label="Delete invoice"
                disabled={deletingId === inv.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(inv.id);
                }}
                className="absolute top-3 right-3 text-neutral-400 hover:text-red-600 disabled:opacity-40"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              <div className="pr-6">
                <p className="font-bold text-black">{inv.vendorName ?? "Unknown vendor"}</p>
                <p className="font-mono text-lg text-black">{formatINR(inv.totalAmount)}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-neutral-600">{inv.invoiceDate ?? "—"}</span>
                <StatusBadge needsReview={inv.needsReview} />
              </div>
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>{inv.lineItems?.length ?? 0} line items</span>
                <a
                  href={inv.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-amber-600 hover:underline"
                >
                  view file
                </a>
              </div>
            </div>
          ))}
          {!loadingList && sortedInvoices.length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-neutral-400">
              No invoices yet — upload one above.
            </div>
          )}
          {loadingList && (
            <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-neutral-400">
              Loading…
            </div>
          )}
        </div>
      </section>

      <InvoiceDetail invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}
