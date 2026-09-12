"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type LineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
};

export type ConfidenceMap = Record<string, { score: number; flagged: boolean; reason: string }>;

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

// Fields that can be corrected via the edit UI (matches the API's
// EDITABLE_FIELD_COLUMNS) -- line_items is confirmable but not directly
// editable here, same reasoning as the backend.
const EDITABLE_FIELDS = new Set([
  "vendor_name",
  "invoice_number",
  "invoice_date",
  "due_date",
  "currency",
  "subtotal_amount",
  "tax_amount",
  "total_amount",
]);

function fieldState(confidence: ConfidenceMap | null, key: string, hasValue: boolean) {
  const fc = confidence?.[key];
  const flagged = fc?.flagged ?? false;
  return { flagged, missing: flagged && !hasValue, reason: fc?.reason };
}

function ReviewControls({
  fieldKey,
  onConfirm,
  onStartEdit,
  saving,
}: {
  fieldKey: string;
  onConfirm: () => void;
  onStartEdit: () => void;
  saving: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 ml-2">
      <button
        type="button"
        onClick={onConfirm}
        disabled={saving}
        className="text-xs underline text-neutral-400 hover:text-white disabled:opacity-40"
      >
        Confirm
      </button>
      {EDITABLE_FIELDS.has(fieldKey) && (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={saving}
          className="text-xs underline text-neutral-400 hover:text-white disabled:opacity-40"
        >
          Edit
        </button>
      )}
    </span>
  );
}

function EditRow({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm font-mono text-neutral-100 focus:outline-none focus:border-white"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-white px-2 py-1 text-xs font-medium text-black disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-neutral-400 hover:text-white">
        Cancel
      </button>
    </div>
  );
}

export function InvoiceReview({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setInvoice(null);
      setLoadError(null);
      setShowOriginal(false);
      setEditingField(null);
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to load invoice (${res.status})`);
        }
        const data: InvoiceData = await res.json();
        if (cancelled) return;
        setInvoice(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submitPatch(field: string, action: "confirm" | "correct", value?: string) {
    setActionError(null);
    setSavingField(field);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, action, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Update failed (${res.status})`);
      }
      const updated: InvoiceData = await res.json();
      setInvoice(updated);
      setEditingField(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingField(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse bg-neutral-800" />
          <div className="h-8 w-28 animate-pulse bg-neutral-800" />
        </div>
        <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="h-8 w-48 animate-pulse bg-neutral-800" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 animate-pulse bg-neutral-800" />
                  <div className="h-4 w-24 animate-pulse bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-3 w-20 animate-pulse bg-neutral-800" />
            <div className="mt-3 border-b border-neutral-800 pb-2 flex gap-4">
              <div className="h-3 flex-1 animate-pulse bg-neutral-800" />
              <div className="h-3 w-10 animate-pulse bg-neutral-800" />
              <div className="h-3 w-16 animate-pulse bg-neutral-800" />
              <div className="h-3 w-16 animate-pulse bg-neutral-800" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-b border-neutral-800 py-2.5">
                <div className="h-4 flex-1 animate-pulse bg-neutral-800" />
                <div className="h-4 w-10 animate-pulse bg-neutral-800" />
                <div className="h-4 w-16 animate-pulse bg-neutral-800" />
                <div className="h-4 w-16 animate-pulse bg-neutral-800" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-neutral-800 pt-4">
            <div className="w-full max-w-xs space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse bg-neutral-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-8 space-y-4">
        <p className="text-red-400">{loadError ?? "Invoice not found"}</p>
        <Link href="/" className="text-neutral-100 underline hover:text-white">
          Back to list
        </Link>
      </div>
    );
  }

  const confidence = invoice.confidence;

  function renderScalar(label: string, key: string, value: string | null, mono = false, showReason = true) {
    const hasValue = value !== null && value !== "";
    const { flagged, reason } = fieldState(confidence, key, hasValue);
    const isEditing = editingField === key;
    const saving = savingField === key;

    return (
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
        {isEditing ? (
          <EditRow
            value={editValue}
            onChange={setEditValue}
            onSave={() => submitPatch(key, "correct", editValue)}
            onCancel={() => setEditingField(null)}
            saving={saving}
          />
        ) : (
          <>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`text-sm text-neutral-100 ${mono ? "font-mono" : ""}`}>
                {hasValue ? value : <span className="text-neutral-500">— not extracted —</span>}
              </span>
              {flagged && (
                <span className="rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                  ⚠
                </span>
              )}
            </div>
            {flagged && showReason && reason && (
              <div className="mt-0.5 text-xs text-red-400">⚠ {reason}</div>
            )}
            {flagged && (
              <ReviewControls
                fieldKey={key}
                saving={saving}
                onConfirm={() => submitPatch(key, "confirm")}
                onStartEdit={() => {
                  setEditingField(key);
                  setEditValue(value ?? "");
                }}
              />
            )}
          </>
        )}
      </div>
    );
  }

  const lineItemsFlag = confidence?.["line_items"];
  const items = invoice.lineItems ?? [];

  // Subtotal/tax/total commonly get flagged together when they don't
  // reconcile (see confidence.ts) -- but their reasons aren't always
  // byte-identical (total_amount can carry an extra self-reported clause
  // on top of the shared math-mismatch sentence, joined with "; "). Union
  // the unique reason *segments* across all flagged amount fields and show
  // that once, instead of repeating near-duplicate paragraphs per field.
  const amountFieldKeys = ["subtotal_amount", "tax_amount", "total_amount"] as const;
  const flaggedAmountFields = amountFieldKeys.filter((k) => confidence?.[k]?.flagged);
  const amountReasonSegments = new Set<string>();
  for (const k of flaggedAmountFields) {
    confidence?.[k]?.reason?.split("; ").forEach((segment) => {
      if (segment) amountReasonSegments.add(segment);
    });
  }
  const sharedAmountReason =
    flaggedAmountFields.length > 1 ? Array.from(amountReasonSegments).join("; ") : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-100 underline hover:text-white">
          ← Back to list
        </Link>
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-100 underline hover:border-white"
        >
          {showOriginal ? "Hide original" : "View original"}
        </button>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <div className={`grid grid-cols-1 gap-6 ${showOriginal ? "md:grid-cols-2" : ""}`}>
        <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-100">
                  {invoice.vendorName || "Unknown vendor"}
                </h1>
                {fieldState(confidence, "vendor_name", !!invoice.vendorName).flagged && (
                  <span className="rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                    ⚠
                  </span>
                )}
              </div>
              {(() => {
                const { flagged, reason } = fieldState(confidence, "vendor_name", !!invoice.vendorName);
                const isEditing = editingField === "vendor_name";
                const saving = savingField === "vendor_name";
                if (!flagged) return null;
                return (
                  <div className="mt-1">
                    {reason && <p className="text-xs text-red-400">⚠ {reason}</p>}
                    {isEditing ? (
                      <EditRow
                        value={editValue}
                        onChange={setEditValue}
                        onSave={() => submitPatch("vendor_name", "correct", editValue)}
                        onCancel={() => setEditingField(null)}
                        saving={saving}
                      />
                    ) : (
                      <ReviewControls
                        fieldKey="vendor_name"
                        saving={saving}
                        onConfirm={() => submitPatch("vendor_name", "confirm")}
                        onStartEdit={() => {
                          setEditingField("vendor_name");
                          setEditValue(invoice.vendorName ?? "");
                        }}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {renderScalar("Invoice #", "invoice_number", invoice.invoiceNumber, true)}
              {renderScalar("Invoice date", "invoice_date", invoice.invoiceDate, true)}
              {renderScalar("Due date", "due_date", invoice.dueDate, true)}
              {renderScalar("Currency", "currency", invoice.currency, true)}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Line items
              </h3>
              {lineItemsFlag?.flagged && (
                <ReviewControls
                  fieldKey="line_items"
                  saving={savingField === "line_items"}
                  onConfirm={() => submitPatch("line_items", "confirm")}
                  onStartEdit={() => {}}
                />
              )}
            </div>
            {lineItemsFlag?.flagged && lineItemsFlag.reason && (
              <div className="mt-1 text-xs text-red-400">⚠ {lineItemsFlag.reason}</div>
            )}
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
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
                    <td className="py-2 pr-4 text-right font-mono text-neutral-300">
                      {item.quantity ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-neutral-300">
                      {item.unit_price ?? "—"}
                    </td>
                    <td className="py-2 pr-0 text-right font-mono text-neutral-100">{item.amount}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-500">
                      No line items extracted
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-neutral-800 pt-4">
            <div className="w-full max-w-xs space-y-1">
              {renderScalar("Subtotal", "subtotal_amount", invoice.subtotalAmount, true, !sharedAmountReason)}
              {renderScalar("Tax", "tax_amount", invoice.taxAmount, true, !sharedAmountReason)}
              {renderScalar("Total", "total_amount", invoice.totalAmount, true, !sharedAmountReason)}
              {sharedAmountReason && (
                <div className="mt-2 border-t border-red-500/30 pt-2 text-xs text-red-400">
                  ⚠ {sharedAmountReason}
                </div>
              )}
            </div>
          </div>
        </div>

        {showOriginal && (
          <div className="flex h-full min-h-[400px] flex-col overflow-hidden border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-500">
              <span>Original file</span>
              <a
                href={invoice.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-100 underline hover:text-white"
              >
                Open in new tab
              </a>
            </div>
            <div className="min-h-[400px] flex-1">
              {/\.pdf(\?|#|$)/i.test(invoice.fileName) || /\.pdf(\?|#|$)/i.test(invoice.fileUrl) ? (
                <iframe src={invoice.fileUrl} title="Original invoice file" className="h-full min-h-[400px] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote/blob source
                <img src={invoice.fileUrl} alt="Original invoice" className="h-full w-full object-contain" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
