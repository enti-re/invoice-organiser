"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DatePicker } from "@/app/components/DatePicker";

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
  confidence: Record<string, { score: number; flagged: boolean; reason: string }> | null;
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
  // Row-level summary badge for the list view — per-field detail (which
  // specific field is flagged, and why) lives on the invoice review page.
  // Both states use the same pill shape so the column reads consistently;
  // only the color signals the difference.
  if (needsReview) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/40">
        Needs review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-neutral-500 border border-neutral-800">
      Reviewed
    </span>
  );
}

function SortIndicator({ direction }: { direction: SortDirection }) {
  return <span className="text-red-400">{direction === "asc" ? "▲" : "▼"}</span>;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800 ${className}`} />;
}

// Sizes below are measured from the real rendered row/card (getBoundingClientRect),
// not guessed -- each placeholder height matches its real counterpart's actual
// content-box height (accounting for line-height, not just font-size: text-xs is
// 12px font but a 16px line-height, text-sm is 14px font but a 20px line-height,
// etc.) so swapping skeleton for real content doesn't shift the layout (CLS).
function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800 last:border-0">
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-32" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-20" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-24" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-16" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-6" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-[22px] w-24 rounded-full" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-[26px] w-20" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-4 w-4" />
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-neutral-800 p-4 space-y-2">
      <div>
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-7 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="h-[22px] w-24 rounded-full" />
      </div>
      <SkeletonBlock className="h-5 w-24" />
      <SkeletonBlock className="h-[38px] w-full" />
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
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
  const [dragActive, setDragActive] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  function applyFile(file: File | null) {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    applyFile(e.dataTransfer.files?.[0] ?? null);
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

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setListError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
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
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16 space-y-14">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">Invoice Extraction</h1>
        <p className="text-base text-neutral-400 max-w-2xl leading-relaxed">
          Upload an invoice — fields extract automatically. Only{" "}
          <span className="text-red-400 font-medium">Needs review</span> rows need a second look.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium text-neutral-100">Upload an invoice</h2>
        <form onSubmit={handleUpload}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 border p-10 text-center cursor-pointer transition-colors ${
              dragActive ? "border-white bg-neutral-900" : "border-neutral-800 hover:border-neutral-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <>
                <FileIcon className="w-6 h-6 text-neutral-400" />
                <p className="font-medium text-neutral-100">{selectedFile.name}</p>
                <p className="text-sm text-neutral-400">
                  {(selectedFile.size / 1024).toFixed(0)} KB — click or drop to replace
                </p>
              </>
            ) : (
              <>
                <UploadIcon className="w-6 h-6 text-neutral-400" />
                <p className="font-medium text-neutral-100">Drop an invoice here, or click to browse</p>
                <p className="text-sm text-neutral-400">PDF, PNG, JPEG, or WEBP — up to 15MB</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="bg-white text-black text-sm px-4 py-2 font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
            >
              {uploading ? "Extracting…" : "Upload & extract"}
            </button>
            {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-neutral-100">Invoices</h2>

        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2.5 text-sm border-b border-neutral-800 pb-5"
        >
          <input
            placeholder="Vendor contains…"
            value={filters.vendor}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
            className="border border-neutral-700 px-3 py-2 focus:outline-none focus:border-white"
          />
          <DatePicker
            value={filters.dateFrom}
            onChange={(v) => setFilters({ ...filters, dateFrom: v })}
            placeholder="From"
            className="w-36"
          />
          <span className="text-neutral-400">to</span>
          <DatePicker
            value={filters.dateTo}
            onChange={(v) => setFilters({ ...filters, dateTo: v })}
            placeholder="To"
            className="w-36"
          />
          <input
            type="number"
            placeholder="Min ₹"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            className="border border-neutral-700 px-3 py-2 w-24 font-mono focus:outline-none focus:border-white"
          />
          <input
            type="number"
            placeholder="Max ₹"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            className="border border-neutral-700 px-3 py-2 w-24 font-mono focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            className="cursor-pointer border border-neutral-700 px-4 py-2 font-medium text-neutral-100 hover:border-white"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              fetchInvoices(EMPTY_FILTERS);
            }}
            className="cursor-pointer text-neutral-400 px-3 py-2 underline hover:text-neutral-100"
          >
            Clear
          </button>
        </form>

        {listError && <p className="text-sm text-red-400">{listError}</p>}

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-800 text-neutral-400">
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("vendorName")}
                    className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
                  >
                    Vendor
                    {sortKey === "vendorName" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("invoiceDate")}
                    className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
                  >
                    Invoice date
                    {sortKey === "invoiceDate" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("totalAmount")}
                    className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
                  >
                    Total
                    {sortKey === "totalAmount" && <SortIndicator direction={sortDirection} />}
                  </button>
                </th>
                <th className="py-3 pr-4 font-medium">Tax</th>
                <th className="py-3 pr-4 font-medium">Line items</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium" />
                <th className="py-3 pr-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-neutral-400">
                    No invoices yet — upload one above.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="group border-b border-neutral-800 last:border-0 hover:bg-neutral-900">
                    <td className="py-3 pr-4 text-neutral-100">{inv.vendorName ?? "—"}</td>
                    <td className="py-3 pr-4 font-mono text-neutral-300">{inv.invoiceDate ?? "—"}</td>
                    <td className="py-3 pr-4 font-mono text-neutral-100">{formatINR(inv.totalAmount)}</td>
                    <td className="py-3 pr-4 font-mono text-neutral-300">{formatINR(inv.taxAmount)}</td>
                    <td className="py-3 pr-4 text-neutral-300">{inv.lineItems?.length ?? 0}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge needsReview={inv.needsReview} />
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="cursor-pointer border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:border-white"
                      >
                        Review
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        aria-label="Delete invoice"
                        disabled={deletingId === inv.id}
                        onClick={() => setConfirmDeleteId(inv.id)}
                        className="cursor-pointer text-neutral-700 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {loadingList ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : sortedInvoices.length === 0 ? (
            <div className="border border-neutral-800 p-10 text-center text-neutral-400">
              No invoices yet — upload one above.
            </div>
          ) : (
            sortedInvoices.map((inv) => (
              <div key={inv.id} className="relative border border-neutral-800 p-4 space-y-2">
                <button
                  type="button"
                  aria-label="Delete invoice"
                  disabled={deletingId === inv.id}
                  onClick={() => setConfirmDeleteId(inv.id)}
                  className="absolute top-3 right-3 cursor-pointer text-neutral-600 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <div className="pr-6">
                  <p className="font-bold text-neutral-100">{inv.vendorName ?? "Unknown vendor"}</p>
                  <p className="font-mono text-lg text-neutral-100">{formatINR(inv.totalAmount)}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-neutral-400">{inv.invoiceDate ?? "—"}</span>
                  <StatusBadge needsReview={inv.needsReview} />
                </div>
                <div className="text-sm text-neutral-400">{inv.lineItems?.length ?? 0} line items</div>
                <button
                  type="button"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="w-full cursor-pointer border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:border-white"
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm border border-neutral-800 bg-neutral-900 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="font-medium text-neutral-100">Delete this invoice?</h3>
              <p className="text-sm text-neutral-400">
                {invoices.find((inv) => inv.id === confirmDeleteId)?.vendorName ?? "This invoice"}{" "}
                will be permanently removed. This can&apos;t be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="cursor-pointer border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:border-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className="cursor-pointer bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
