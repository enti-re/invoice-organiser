import type { InvoiceListController } from "@/app/components/useInvoiceList";
import { SkeletonCard, StatusBadge } from "@/app/components/InvoiceListUI";
import { Spinner, TrashIcon } from "@/app/components/icons";
import { formatINR } from "@/lib/invoice-list";

export function InvoiceCards({ list }: { list: InvoiceListController }) {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {list.loadingList ? (
        Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
      ) : list.sortedInvoices.length === 0 ? (
        <div className="border border-neutral-800 p-10 text-center text-neutral-400">
          {list.hasActiveFilters ? (
            <>
              No invoices match your filters.{" "}
              <button
                type="button"
                onClick={list.clearFilters}
                className="cursor-pointer underline hover:text-neutral-100"
              >
                Clear filters
              </button>
            </>
          ) : (
            "No invoices yet — upload one above."
          )}
        </div>
      ) : (
        list.sortedInvoices.map((inv) => (
          <div key={inv.id} className="relative border border-neutral-800 p-4 space-y-2">
            <button
              type="button"
              aria-label="Delete invoice"
              disabled={list.deletingId === inv.id}
              onClick={() => list.setConfirmDeleteId(inv.id)}
              className="absolute top-3 right-3 cursor-pointer text-neutral-600 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {list.deletingId === inv.id ? <Spinner className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
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
              onClick={() => list.router.push(`/invoices/${inv.id}`)}
              className="w-full cursor-pointer border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:border-white"
            >
              Review
            </button>
          </div>
        ))
      )}
    </div>
  );
}
