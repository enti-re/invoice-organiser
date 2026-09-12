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
    <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-orange-500 bg-orange-500/10 px-2 py-1 text-xs text-orange-300">
      <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-black">!</span>
      {label}
    </span>
  );
}

function FlagBadge() {
  return (
    <span className="rounded-full border border-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
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
      <div className={`text-xs uppercase tracking-wide text-neutral-400 ${alignClass}`}>{label}</div>
      {missing ? (
        <div className={`mt-1 flex ${align === "right" ? "justify-end" : "justify-start"}`}>
          <MissingBadge />
        </div>
      ) : (
        <div className={`mt-0.5 flex items-baseline gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
          <span className={`text-sm text-neutral-100 ${mono ? "font-mono" : ""}`}>
            {hasValue ? value : <span className="text-neutral-400">—</span>}
          </span>
          {flagged && hasValue && <FlagBadge />}
        </div>
      )}
      {flagged && hasValue && reason && (
        <div className={`mt-0.5 text-xs text-orange-400 ${alignClass}`}>⚠ {reason}</div>
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
        <h2 className="text-2xl font-bold text-neutral-100">{hasValue ? value : "Unknown vendor"}</h2>
        {flagged && hasValue && <FlagBadge />}
      </div>
      {flagged && hasValue && reason && <p className="mt-1 text-xs text-orange-400">⚠ {reason}</p>}
    </div>
  );
}

function SectionFlag({ fieldKey, confidence }: { fieldKey: string; confidence: ConfidenceMap }) {
  const fc = confidence?.[fieldKey];
  if (!fc?.flagged) return null;
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-orange-400">
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
      <span className={emphasize ? "text-sm font-semibold text-neutral-100" : "text-sm text-neutral-400"}>{label}</span>
      <div className="text-right">
        {missing ? (
          <MissingBadge label="Verify manually" />
        ) : (
          <span
            className={
              emphasize
                ? "font-mono text-lg font-bold text-neutral-100"
                : "font-mono text-sm text-neutral-100"
            }
          >
            {display ?? "—"}
          </span>
        )}
        {flagged && hasValue && reason && <div className="mt-0.5 text-xs text-orange-400">⚠ {reason}</div>}
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
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-400">Line items</h3>
      </div>
      <SectionFlag fieldKey="line_items" confidence={confidence} />
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 text-right font-medium">Qty</th>
            <th className="py-2 pr-4 text-right font-medium">Unit price</th>
            <th className="py-2 pr-0 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-neutral-800">
              <td className="py-2 pr-4 text-neutral-100">{item.description}</td>
              <td className="py-2 pr-4 text-right font-mono text-neutral-300">{item.quantity ?? "—"}</td>
              <td className="py-2 pr-4 text-right font-mono text-neutral-300">{item.unit_price ?? "—"}</td>
              <td className="py-2 pr-0 text-right font-mono text-neutral-100">{item.amount}</td>
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

function RendeorangeInvoice({ invoice }: { invoice: InvoiceDetailData }) {
  const confidence = invoice.confidence;
  return (
    <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
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

      <div className="flex justify-end border-t border-neutral-800 pt-4">
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
          <div className="mt-1 border-t border-neutral-800 pt-2">
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
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
        <span>Original file</span>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-neutral-100 underline hover:text-teal-400">
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
  // Auto-open the side-by-side comparison when there's actually something to
  // verify (needsReview) -- most invoices are clean and don't need the
  // original alongside them, but a flagged one benefits from the comparison
  // being immediately visible rather than requiring an extra click.
  const [showOriginal, setShowOriginal] = useState(invoice?.needsReview ?? false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | undefined>(invoice?.id);

  if (invoice?.id !== lastInvoiceId) {
    setLastInvoiceId(invoice?.id);
    setShowOriginal(invoice?.needsReview ?? false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto border border-neutral-800 bg-neutral-900 p-6 shadow-none ${
          showOriginal ? "max-w-6xl" : "max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-neutral-400">{invoice.fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 underline hover:border-white"
            >
              {showOriginal ? "Hide original" : "View original"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="border border-neutral-700 px-2.5 py-1.5 text-sm text-neutral-400 hover:border-white"
            >
              ✕
            </button>
          </div>
        </div>

        {!invoice.confidence && invoice.needsReview && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-black">!</span>
            This invoice has fields that may need review
          </div>
        )}

        {showOriginal ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RendeorangeInvoice invoice={invoice} />
            <OriginalFileViewer fileUrl={invoice.fileUrl} fileName={invoice.fileName} />
          </div>
        ) : (
          <RendeorangeInvoice invoice={invoice} />
        )}
      </div>
    </div>
  );
}
