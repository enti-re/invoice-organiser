import type { InvoiceListController } from "@/app/components/useInvoiceList";
import { InvoiceCard } from "@/app/components/InvoiceCard";
import { SkeletonCard } from "@/app/components/InvoiceListUI";

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
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            isDeleting={list.deletingId === inv.id}
            onDeleteRequest={() => list.setConfirmDeleteId(inv.id)}
            onReview={() => list.router.push(`/invoices/${inv.id}`)}
          />
        ))
      )}
    </div>
  );
}
