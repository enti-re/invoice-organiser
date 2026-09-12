"use client";

import Link from "next/link";

import type { InvoiceData } from "@/app/components/InvoiceReview.types";
import { InvoiceReviewSkeleton } from "@/app/components/InvoiceReviewSkeleton";
import { FlagIcon, InlineReviewPanel } from "@/app/components/InlineReviewPanel";
import { LineItemRow } from "@/app/components/LineItemRow";
import { OriginalFilePanel } from "@/app/components/OriginalFilePanel";
import { ScalarField } from "@/app/components/ScalarField";
import { useInvoiceReview } from "@/app/components/useInvoiceReview";
import { EDITABLE_FIELDS, fieldState } from "@/lib/field-review";

export type { InvoiceData };

export function InvoiceReview({ id }: { id: string }) {
  const review = useInvoiceReview(id);
  const { invoice, loading, loadError, expandedPanelRef } = review;

  if (loading) {
    return <InvoiceReviewSkeleton />;
  }

  if (loadError || !invoice) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-4xl px-6 py-16 md:px-8 space-y-4">
        <p className="text-red-400">{loadError ?? "Invoice not found"}</p>
        <Link href="/app" className="text-neutral-100 underline hover:text-white">
          Back to list
        </Link>
      </div>
    );
  }

  const confidence = invoice.confidence;
  const lineItemsFlag = confidence?.["line_items"];
  const vendorFlag = fieldState(confidence, "vendor_name", !!invoice.vendorName);
  const documentTypeFlag = confidence?.["document_type"];
  const items = invoice.lineItems ?? [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-6 py-12 md:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-sm text-neutral-100 underline hover:text-white">
          ← Back to list
        </Link>
        <button
          type="button"
          onClick={() => review.setShowOriginal((v) => !v)}
          className="cursor-pointer border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-100 underline hover:border-white"
        >
          {review.showOriginal ? "Hide original" : "View original"}
        </button>
      </div>

      {documentTypeFlag?.flagged && (
        <div className="flex flex-col gap-3 border border-red-500/40 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-400">This doesn&apos;t look like an invoice</p>
            <p className="mt-0.5 text-sm text-red-300/80">{documentTypeFlag.reason}</p>
          </div>
          <button
            type="button"
            onClick={() => review.handleConfirm("document_type")}
            disabled={review.savingField === "document_type"}
            className="shrink-0 cursor-pointer border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {review.savingField === "document_type" ? "Saving…" : "This is actually an invoice"}
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${review.showOriginal ? "md:grid-cols-2" : ""}`}>
        <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div
              className="relative"
              ref={review.expandedField === "vendor_name" ? expandedPanelRef : undefined}
            >
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-100">
                  {invoice.vendorName || "Unknown vendor"}
                </h1>
                {vendorFlag.flagged && <FlagIcon onClick={() => review.toggleExpand("vendor_name")} />}
              </div>
              {vendorFlag.flagged && review.expandedField === "vendor_name" && (
                <InlineReviewPanel
                  reason={vendorFlag.reason}
                  editable={EDITABLE_FIELDS.has("vendor_name")}
                  editing={review.editingField === "vendor_name"}
                  editValue={review.editValue}
                  onEditChange={review.setEditValue}
                  onConfirm={() => review.handleConfirm("vendor_name")}
                  onStartEdit={() => review.startEdit("vendor_name", invoice.vendorName)}
                  onSave={() => review.handleSave("vendor_name")}
                  onCancelEdit={() => review.setEditingField(null)}
                  onClose={() => review.toggleExpand("vendor_name")}
                  saving={review.savingField === "vendor_name"}
                  error={review.actionError}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ScalarField label="Invoice #" fieldKey="invoice_number" value={invoice.invoiceNumber} mono review={review} />
              <ScalarField label="Invoice date" fieldKey="invoice_date" value={invoice.invoiceDate} mono review={review} />
              <ScalarField label="Due date" fieldKey="due_date" value={invoice.dueDate} mono review={review} />
              <ScalarField label="Currency" fieldKey="currency" value={invoice.currency} mono review={review} />
            </div>
          </div>

          <div
            className="relative"
            ref={review.expandedField === "line_items" ? expandedPanelRef : undefined}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Line items
              </h3>
              {lineItemsFlag?.flagged && (
                <FlagIcon onClick={() => review.toggleExpand("line_items")} />
              )}
            </div>
            {lineItemsFlag?.flagged && review.expandedField === "line_items" && (
              <InlineReviewPanel
                reason={lineItemsFlag.reason}
                editable={false}
                editing={false}
                editValue=""
                onEditChange={() => {}}
                onConfirm={() => review.handleConfirm("line_items")}
                onStartEdit={() => {}}
                onSave={() => {}}
                onCancelEdit={() => {}}
                onClose={() => review.toggleExpand("line_items")}
                saving={review.savingField === "line_items"}
                error={review.actionError}
              />
            )}
            <table className="mt-3 w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="w-[52%] py-2 pr-4 font-medium">Description</th>
                  <th className="w-[12%] py-2 pr-4 text-right font-medium">Qty</th>
                  <th className="w-[18%] py-2 pr-4 text-right font-medium">Unit price</th>
                  <th className="w-[18%] py-2 pr-0 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <LineItemRow key={i} item={item} />
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
              <ScalarField label="Subtotal" fieldKey="subtotal_amount" value={invoice.subtotalAmount} mono align="right" review={review} />
              <ScalarField label="Tax" fieldKey="tax_amount" value={invoice.taxAmount} mono align="right" review={review} />
              <ScalarField label="Total" fieldKey="total_amount" value={invoice.totalAmount} mono align="right" review={review} />
            </div>
          </div>
        </div>

        {review.showOriginal && (
          <OriginalFilePanel key={invoice.id} fileUrl={invoice.fileUrl} fileName={invoice.fileName} />
        )}
      </div>
    </div>
  );
}
