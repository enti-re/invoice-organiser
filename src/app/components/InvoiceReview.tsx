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

// Compact flagged-field indicator: a small warning icon. Clicking it
// expands an inline panel directly below the field (see InlineReviewPanel)
// with the reason and Confirm/Edit actions. Two earlier approaches were
// tried and dropped: a hover tooltip (moving the mouse toward it to
// interact broke the hover state it depended on) and a centered modal
// (too much ceremony for what's often a one-click "confirm" action, and it
// dims the document the reviewer is actually trying to compare against).
// An inline accordion keeps the action anchored to the exact field it's
// about, with no overlay and no hover fragility.
function FlagIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Needs review"
      className="inline-flex items-center rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/20 hover:text-red-300"
    >
      ⚠
    </button>
  );
}

function InlineReviewPanel({
  reason,
  editable,
  editing,
  editValue,
  onEditChange,
  onConfirm,
  onStartEdit,
  onSave,
  onCancelEdit,
  saving,
  error,
}: {
  reason?: string;
  editable: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onConfirm: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-1.5 border border-neutral-700 bg-neutral-950 p-3 text-left text-sm">
      {editing ? (
        <EditRow
          value={editValue}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancelEdit}
          saving={saving}
        />
      ) : (
        <>
          {reason && <p className="text-xs text-red-400">⚠ {reason}</p>}
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:border-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            {editable && (
              <button
                type="button"
                onClick={onStartEdit}
                className="bg-white px-3 py-1 text-xs font-medium text-black"
              >
                Edit
              </button>
            )}
          </div>
        </>
      )}
    </div>
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
  const [expandedField, setExpandedField] = useState<string | null>(null);
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
      setExpandedField(null);
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

  async function submitPatch(
    field: string,
    action: "confirm" | "correct",
    value?: string,
  ): Promise<boolean> {
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
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
      return false;
    } finally {
      setSavingField(null);
    }
  }

  function toggleExpand(key: string) {
    setExpandedField((f) => (f === key ? null : key));
    setEditingField(null);
    setActionError(null);
  }

  function startEdit(key: string, value: string | null) {
    setEditingField(key);
    setEditValue(value ?? "");
  }

  async function handleConfirm(key: string) {
    const ok = await submitPatch(key, "confirm");
    if (ok) setExpandedField(null);
  }

  async function handleSave(key: string) {
    const ok = await submitPatch(key, "correct", editValue);
    if (ok) {
      setExpandedField(null);
      setEditingField(null);
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

  function renderScalar(
    label: string,
    key: string,
    value: string | null,
    mono = false,
    align: "left" | "right" = "left",
  ) {
    const hasValue = value !== null && value !== "";
    const { flagged, reason } = fieldState(confidence, key, hasValue);
    const alignClass = align === "right" ? "text-right" : "";

    return (
      <div className={alignClass}>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
        <div className={`mt-0.5 flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
          <span className={`text-sm text-neutral-100 ${mono ? "font-mono" : ""}`}>
            {hasValue ? value : <span className="text-neutral-500">— not extracted —</span>}
          </span>
          {flagged && <FlagIcon onClick={() => toggleExpand(key)} />}
        </div>
        {flagged && expandedField === key && (
          <InlineReviewPanel
            reason={reason}
            editable={EDITABLE_FIELDS.has(key)}
            editing={editingField === key}
            editValue={editValue}
            onEditChange={setEditValue}
            onConfirm={() => handleConfirm(key)}
            onStartEdit={() => startEdit(key, value)}
            onSave={() => handleSave(key)}
            onCancelEdit={() => setEditingField(null)}
            saving={savingField === key}
            error={actionError}
          />
        )}
      </div>
    );
  }

  const lineItemsFlag = confidence?.["line_items"];
  const vendorFlag = fieldState(confidence, "vendor_name", !!invoice.vendorName);
  const items = invoice.lineItems ?? [];

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

      <div className={`grid grid-cols-1 gap-6 ${showOriginal ? "md:grid-cols-2" : ""}`}>
        <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-100">
                  {invoice.vendorName || "Unknown vendor"}
                </h1>
                {vendorFlag.flagged && <FlagIcon onClick={() => toggleExpand("vendor_name")} />}
              </div>
              {vendorFlag.flagged && expandedField === "vendor_name" && (
                <InlineReviewPanel
                  reason={vendorFlag.reason}
                  editable={EDITABLE_FIELDS.has("vendor_name")}
                  editing={editingField === "vendor_name"}
                  editValue={editValue}
                  onEditChange={setEditValue}
                  onConfirm={() => handleConfirm("vendor_name")}
                  onStartEdit={() => startEdit("vendor_name", invoice.vendorName)}
                  onSave={() => handleSave("vendor_name")}
                  onCancelEdit={() => setEditingField(null)}
                  saving={savingField === "vendor_name"}
                  error={actionError}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {renderScalar("Invoice #", "invoice_number", invoice.invoiceNumber, true)}
              {renderScalar("Invoice date", "invoice_date", invoice.invoiceDate, true)}
              {renderScalar("Due date", "due_date", invoice.dueDate, true)}
              {renderScalar("Currency", "currency", invoice.currency, true)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Line items
              </h3>
              {lineItemsFlag?.flagged && (
                <FlagIcon onClick={() => toggleExpand("line_items")} />
              )}
            </div>
            {lineItemsFlag?.flagged && expandedField === "line_items" && (
              <InlineReviewPanel
                reason={lineItemsFlag.reason}
                editable={false}
                editing={false}
                editValue=""
                onEditChange={() => {}}
                onConfirm={() => handleConfirm("line_items")}
                onStartEdit={() => {}}
                onSave={() => {}}
                onCancelEdit={() => {}}
                saving={savingField === "line_items"}
                error={actionError}
              />
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
              {renderScalar("Subtotal", "subtotal_amount", invoice.subtotalAmount, true, "right")}
              {renderScalar("Tax", "tax_amount", invoice.taxAmount, true, "right")}
              {renderScalar("Total", "total_amount", invoice.totalAmount, true, "right")}
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
