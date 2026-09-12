import type { InvoiceRow } from "@/app/components/InvoiceList.types";
import { StatusBadge } from "@/app/components/InvoiceListUI";
import { Spinner, TrashIcon } from "@/app/components/icons";
import { formatINR } from "@/lib/invoice-list";

export function InvoiceTableRow({
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
    <tr className="group border-b border-neutral-800 last:border-0 hover:bg-neutral-900">
      <td className="truncate py-3 pr-4 text-neutral-100" title={invoice.vendorName ?? undefined}>
        {invoice.vendorName ?? "—"}
      </td>
      <td className="py-3 pr-4 font-mono text-neutral-300">{invoice.invoiceDate ?? "—"}</td>
      <td className="py-3 pr-4 font-mono text-neutral-100">{formatINR(invoice.totalAmount)}</td>
      <td className="py-3 pr-4 font-mono text-neutral-300">{formatINR(invoice.taxAmount)}</td>
      <td className="py-3 pr-4 text-neutral-300">{invoice.lineItems?.length ?? 0}</td>
      <td className="py-3 pr-4">
        <StatusBadge needsReview={invoice.needsReview} />
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={onReview}
          className="cursor-pointer border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:border-white"
        >
          Review
        </button>
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          aria-label="Delete invoice"
          disabled={isDeleting}
          onClick={onDeleteRequest}
          className="cursor-pointer text-neutral-700 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? <Spinner className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
        </button>
      </td>
    </tr>
  );
}
