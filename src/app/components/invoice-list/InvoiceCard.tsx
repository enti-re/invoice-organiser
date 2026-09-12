import type { InvoiceRow } from "@/app/components/invoice-list/InvoiceList.types";
import { StatusBadge } from "@/app/components/invoice-list/InvoiceListUI";
import { Spinner, TrashIcon } from "@/app/components/icons";
import { formatINR } from "@/lib/invoice-list";

export function InvoiceCard({
  invoice,
  isDeleting,
  onDeleteRequest,
  onReview,
}: {
  invoice: InvoiceRow;
  isDeleting: boolean;
  onDeleteRequest: () => void;
  onReview: () => void;
}) {
  return (
    <div className="relative border border-neutral-800 p-4 space-y-2">
      <button
        type="button"
        aria-label="Delete invoice"
        disabled={isDeleting}
        onClick={onDeleteRequest}
        className="absolute top-3 right-3 cursor-pointer text-neutral-600 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isDeleting ? <Spinner className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
      </button>
      <div className="pr-6">
        <p className="font-bold text-neutral-100">{invoice.vendorName ?? "Unknown vendor"}</p>
        <p className="font-mono text-lg text-neutral-100">{formatINR(invoice.totalAmount)}</p>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-neutral-400">{invoice.invoiceDate ?? "—"}</span>
        <StatusBadge needsReview={invoice.needsReview} />
      </div>
      <div className="text-sm text-neutral-400">{invoice.lineItems?.length ?? 0} line items</div>
      <button
        type="button"
        onClick={onReview}
        className="w-full cursor-pointer border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:border-white"
      >
        Review
      </button>
    </div>
  );
}
