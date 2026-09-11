"use client";

import { useEffect, useState } from "react";

export type LineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
};

export type InvoiceDetailData = {
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
  confidence?: Record<string, { score: number; flagged: boolean; reason: string }> | null;
};

export interface InvoiceDetailProps {
  invoice: InvoiceDetailData | null;
  onClose: () => void;
}

type ConfidenceMap = InvoiceDetailData["confidence"];

function fieldState(confidence: ConfidenceMap, key: string, hasValue: boolean) {
  const fc = confidence?.[key];
  const flagged = fc?.flagged ?? false;
  return { flagged, missing: flagged && !hasValue, reason: fc?.reason };
}

function MissingBadge({ label = "Unable to extract — please verify manually" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-amber-600 bg-amber-50 px-2 py-1 text-xs text-amber-800">
      <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">!</span>
      {label}
    </span>
  );
}

function FlagBadge() {
  return (
    <span className="rounded-full border border-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
      ⚠
    </span>
  );
}

function FieldValue({
  label,
  value,
  fieldKey,
  confidence,
  mono = false,
  align = "left",
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  confidence: ConfidenceMap;
  mono?: boolean;
  align?: "left" | "right";
}) {
  const hasValue = value !== null && value !== "";
  const { flagged, missing, reason } = fieldState(confidence, fieldKey, hasValue);
  const alignClass = align === "right" ? "text-right" : "text-left";

  return (
    <div>
      <div className={`text-xs uppercase tracking-wide text-neutral-500 ${alignClass}`}>{label}</div>
      {missing ? (
        <div className={`mt-1 flex ${align === "right" ? "justify-end" : "justify-start"}`}>
          <MissingBadge />
        </div>
      ) : (
        <div className={`mt-0.5 flex items-baseline gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
          <span className={`text-sm text-black ${mono ? "font-mono" : ""}`}>
            {hasValue ? value : <span className="text-neutral-400">—</span>}
          </span>
          {flagged && hasValue && <FlagBadge />}
        </div>
      )}
      {flagged && hasValue && reason && (
        <div className={`mt-0.5 text-xs text-amber-700 ${alignClass}`}>⚠ {reason}</div>
      )}
    </div>
  );
}

function VendorHeader({ value, confidence }: { value: string | null; confidence: ConfidenceMap }) {
  const hasValue = value !== null && value !== "";
  const { flagged, missing, reason } = fieldState(confidence, "vendor_name", hasValue);

  if (missing) {
    return <MissingBadge />;
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold text-black">{hasValue ? value : "Unknown vendor"}</h2>
        {flagged && hasValue && <FlagBadge />}
      </div>
      {flagged && hasValue && reason && <p className="mt-1 text-xs text-amber-700">⚠ {reason}</p>}
    </div>
  );
}

function SectionFlag({ fieldKey, confidence }: { fieldKey: string; confidence: ConfidenceMap }) {
  const fc = confidence?.[fieldKey];
  if (!fc?.flagged) return null;
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
      <FlagBadge />
      {fc.reason}
    </div>
  );
}

function formatAmount(value: string | null, currency: string | null) {
  if (value === null || value === "") return null;
  return currency ? `${currency} ${value}` : value;
}

function AmountRow({
  label,
  value,
  currency,
  fieldKey,
  confidence,
  emphasize = false,
}: {
  label: string;
  value: string | null;
  currency: string | null;
  fieldKey: string;
  confidence: ConfidenceMap;
  emphasize?: boolean;
}) {
  const hasValue = value !== null && value !== "";
  const { flagged, missing, reason } = fieldState(confidence, fieldKey, hasValue);
  const display = formatAmount(value, currency);

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className={emphasize ? "text-sm font-semibold text-black" : "text-sm text-neutral-500"}>{label}</span>
      <div className="text-right">
        {missing ? (
          <MissingBadge label="Verify manually" />
        ) : (
          <span
            className={
              emphasize
                ? "font-mono text-lg font-bold text-black"
                : "font-mono text-sm text-black"
            }
          >
            {display ?? "—"}
          </span>
        )}
        {flagged && hasValue && reason && <div className="mt-0.5 text-xs text-amber-700">⚠ {reason}</div>}
      </div>
    </div>
  );
}

function LineItemsTable({
  lineItems,
  confidence,
}: {
  lineItems: LineItem[] | null;
  confidence: ConfidenceMap;
}) {
  const items = lineItems ?? [];
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Line items</h3>
      </div>
      <SectionFlag fieldKey="line_items" confidence={confidence} />
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 text-right font-medium">Qty</th>
            <th className="py-2 pr-4 text-right font-medium">Unit price</th>
            <th className="py-2 pr-0 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-black">{item.description}</td>
              <td className="py-2 pr-4 text-right font-mono text-neutral-700">{item.quantity ?? "—"}</td>
              <td className="py-2 pr-4 text-right font-mono text-neutral-700">{item.unit_price ?? "—"}</td>
              <td className="py-2 pr-0 text-right font-mono text-black">{item.amount}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-400">
                No line items extracted
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RenderedInvoice({ invoice }: { invoice: InvoiceDetailData }) {
  const confidence = invoice.confidence;
  return (
    <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <VendorHeader value={invoice.vendorName} confidence={confidence} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <FieldValue
            label="Invoice #"
            value={invoice.invoiceNumber}
            fieldKey="invoice_number"
            confidence={confidence}
            mono
            align="right"
          />
          <FieldValue
            label="Invoice date"
            value={invoice.invoiceDate}
            fieldKey="invoice_date"
            confidence={confidence}
            mono
            align="right"
          />
          <FieldValue
            label="Due date"
            value={invoice.dueDate}
            fieldKey="due_date"
            confidence={confidence}
            mono
            align="right"
          />
          <FieldValue
            label="Currency"
            value={invoice.currency}
            fieldKey="currency"
            confidence={confidence}
            mono
            align="right"
          />
        </div>
      </div>

      <LineItemsTable lineItems={invoice.lineItems} confidence={confidence} />

      <div className="flex justify-end border-t border-neutral-200 pt-4">
        <div className="w-full max-w-xs">
          <AmountRow
            label="Subtotal"
            value={invoice.subtotalAmount}
            currency={invoice.currency}
            fieldKey="subtotal_amount"
            confidence={confidence}
          />
          <AmountRow
            label="Tax"
            value={invoice.taxAmount}
            currency={invoice.currency}
            fieldKey="tax_amount"
            confidence={confidence}
          />
          <div className="mt-1 border-t border-neutral-200 pt-2">
            <AmountRow
              label="Total"
              value={invoice.totalAmount}
              currency={invoice.currency}
              fieldKey="total_amount"
              confidence={confidence}
              emphasize
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function isPdfFile(name: string) {
  return /\.pdf(\?|#|$)/i.test(name);
}

function OriginalFileViewer({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const pdf = isPdfFile(fileName) || isPdfFile(fileUrl);
  return (
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-500">
        <span>Original file</span>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">
          Open in new tab
        </a>
      </div>
      <div className="min-h-[400px] flex-1">
        {pdf ? (
          <iframe src={fileUrl} title="Original invoice file" className="h-full min-h-[400px] w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote/blob source, no next/image benefit
          <img src={fileUrl} alt="Original invoice" className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  );
}

export function InvoiceDetail({ invoice, onClose }: InvoiceDetailProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | undefined>(invoice?.id);

  if (invoice?.id !== lastInvoiceId) {
    setLastInvoiceId(invoice?.id);
    setShowOriginal(false);
  }

  useEffect(() => {
    if (!invoice) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [invoice, onClose]);

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-neutral-200 bg-[#F0EEE6] p-6 shadow-none ${
          showOriginal ? "max-w-6xl" : "max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-neutral-500">{invoice.fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                showOriginal
                  ? "border-amber-600 bg-amber-50 text-amber-700"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {showOriginal ? "Hide original" : "View original"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
            >
              ✕
            </button>
          </div>
        </div>

        {!invoice.confidence && invoice.needsReview && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">!</span>
            This invoice has fields that may need review
          </div>
        )}

        {showOriginal ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RenderedInvoice invoice={invoice} />
            <OriginalFileViewer fileUrl={invoice.fileUrl} fileName={invoice.fileName} />
          </div>
        ) : (
          <RenderedInvoice invoice={invoice} />
        )}
      </div>
    </div>
  );
}
