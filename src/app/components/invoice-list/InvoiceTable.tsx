import type { InvoiceListController } from "@/app/components/invoice-list/useInvoiceList";
import { InvoiceTableRow } from "@/app/components/invoice-list/InvoiceTableRow";
import { SkeletonRow, SortIndicator } from "@/app/components/invoice-list/InvoiceListUI";

export const InvoiceTable = ({ list }: { list: InvoiceListController }) => {
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
              <InvoiceTableRow
                key={inv.id}
                invoice={inv}
                isDeleting={list.deletingId === inv.id}
                onDeleteRequest={() => list.setConfirmDeleteId(inv.id)}
                onReview={() => list.router.push(`/invoices/${inv.id}`)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
