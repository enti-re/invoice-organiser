import type { InvoiceReviewController } from "@/app/components/invoice-review/useInvoiceReview";
import { FlagIcon, InlineReviewPanel } from "@/app/components/invoice-review/InlineReviewPanel";
import { EDITABLE_FIELDS, fieldState } from "@/lib/extraction/field-review";

export function ScalarField({
  label,
  fieldKey,
  value,
  mono = false,
  align = "left",
  review,
}: {
  label: string;
  fieldKey: string;
  value: string | null;
  mono?: boolean;
  align?: "left" | "right";
  review: InvoiceReviewController;
}) {
  const { expandedPanelRef } = review;
  const hasValue = value !== null && value !== "";
  const { flagged, reason } = fieldState(review.invoice?.confidence ?? null, fieldKey, hasValue);
  const isExpanded = review.expandedField === fieldKey;

  return (
    <div
      className={`relative ${align === "right" ? "text-right" : ""}`}
      ref={isExpanded ? expandedPanelRef : undefined}
    >
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        <span className={`text-sm text-neutral-100 ${mono ? "font-mono" : ""}`}>
          {hasValue ? value : <span className="text-neutral-500">— not extracted —</span>}
        </span>
        {flagged && <FlagIcon onClick={() => review.toggleExpand(fieldKey)} />}
      </div>
      {flagged && isExpanded && (
        <InlineReviewPanel
          reason={reason}
          editable={EDITABLE_FIELDS.has(fieldKey)}
          editing={review.editingField === fieldKey}
          editValue={review.editValue}
          onEditChange={review.setEditValue}
          onConfirm={() => review.handleConfirm(fieldKey)}
          onStartEdit={() => review.startEdit(fieldKey, value)}
          onSave={() => review.handleSave(fieldKey)}
          onCancelEdit={() => review.setEditingField(null)}
          onClose={() => review.toggleExpand(fieldKey)}
          saving={review.savingField === fieldKey}
          error={review.actionError}
          align={align}
        />
      )}
    </div>
  );
}
