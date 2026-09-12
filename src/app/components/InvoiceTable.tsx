import type { InvoiceListController } from "@/app/components/useInvoiceList";
import { SkeletonRow, SortIndicator, StatusBadge } from "@/app/components/InvoiceListUI";
import { Spinner, TrashIcon } from "@/app/components/icons";
import { formatINR } from "@/lib/invoice-list";

export function InvoiceTable({ list }: { list: InvoiceListController }) {
  return (
    <div className="hidden md:block">
      <table className="w-full table-fixed text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-neutral-800 text-neutral-400">
            <th className="w-[24%] py-3 pr-4">
              <button
                type="button"
                onClick={() => list.handleSort("vendorName")}
                className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
              >
                Vendor
                {list.sortKey === "vendorName" && <SortIndicator direction={list.sortDirection} />}
              </button>
            </th>
            <th className="w-[14%] py-3 pr-4">
              <button
                type="button"
                onClick={() => list.handleSort("invoiceDate")}
                className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
              >
                Invoice date
                {list.sortKey === "invoiceDate" && <SortIndicator direction={list.sortDirection} />}
              </button>
            </th>
            <th className="w-[14%] py-3 pr-4">
              <button
                type="button"
                onClick={() => list.handleSort("totalAmount")}
                className="flex items-center gap-1 cursor-pointer font-medium text-neutral-400 hover:text-neutral-100"
              >
                Total
                {list.sortKey === "totalAmount" && <SortIndicator direction={list.sortDirection} />}
              </button>
            </th>
            <th className="w-[11%] py-3 pr-4 font-medium">Tax</th>
            <th className="w-[9%] py-3 pr-4 font-medium">Line items</th>
            <th className="w-[14%] py-3 pr-4 font-medium">Status</th>
            <th className="w-[10%] py-3 pr-4 font-medium" />
            <th className="w-[4%] py-3 pr-4" />
          </tr>
        </thead>
        <tbody>
          {list.loadingList ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
          ) : list.sortedInvoices.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-10 text-center text-neutral-400">
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
              </td>
            </tr>
          ) : (
            list.sortedInvoices.map((inv) => (
              <tr key={inv.id} className="group border-b border-neutral-800 last:border-0 hover:bg-neutral-900">
                <td className="truncate py-3 pr-4 text-neutral-100" title={inv.vendorName ?? undefined}>
                  {inv.vendorName ?? "—"}
                </td>
                <td className="py-3 pr-4 font-mono text-neutral-300">{inv.invoiceDate ?? "—"}</td>
                <td className="py-3 pr-4 font-mono text-neutral-100">{formatINR(inv.totalAmount)}</td>
                <td className="py-3 pr-4 font-mono text-neutral-300">{formatINR(inv.taxAmount)}</td>
                <td className="py-3 pr-4 text-neutral-300">{inv.lineItems?.length ?? 0}</td>
                <td className="py-3 pr-4">
                  <StatusBadge needsReview={inv.needsReview} />
                </td>
                <td className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => list.router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:border-white"
                  >
                    Review
                  </button>
                </td>
                <td className="py-3 pr-4">
                  <button
                    type="button"
                    aria-label="Delete invoice"
                    disabled={list.deletingId === inv.id}
                    onClick={() => list.setConfirmDeleteId(inv.id)}
                    className="cursor-pointer text-neutral-700 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {list.deletingId === inv.id ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
