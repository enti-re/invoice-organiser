import { useState } from "react";

import { DateField } from "@/app/components/invoice-list/DateField";
import type { InvoiceListController } from "@/app/components/invoice-list/useInvoiceList";
import { ChevronDownIcon, FilterIcon, SearchIcon } from "@/app/components/icons";

const inputClass =
  "border border-neutral-700 bg-transparent py-2 px-3 text-neutral-100 focus:outline-none focus:border-white";

export const FilterBar = ({ list }: { list: InvoiceListController }) => {
  const { filters, setFilters } = list;
  const hasAdvancedFilters = Boolean(
    filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount,
  );
  const [open, setOpen] = useState(hasAdvancedFilters);

  const invalidDateRange =
    filters.dateFrom !== "" && filters.dateTo !== "" && filters.dateFrom > filters.dateTo;
  const invalidAmountRange =
    filters.minAmount !== "" && filters.maxAmount !== "" && Number(filters.minAmount) > Number(filters.maxAmount);
  const canApply = hasAdvancedFilters && !invalidDateRange && !invalidAmountRange;

  return (
    <div className="space-y-3 border-b border-neutral-800 pb-5 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            placeholder="Search by vendor…"
            value={filters.vendor}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
            className={`${inputClass} w-full pl-9 pr-9`}
          />
          {list.hasActiveFilters && (
            <button
              type="button"
              onClick={list.clearFilters}
              aria-label="Clear filters"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Filters"
          className={`flex shrink-0 cursor-pointer items-center gap-1.5 border px-3 py-2 hover:border-white hover:text-white ${
            hasAdvancedFilters ? "border-neutral-100 text-neutral-100" : "border-neutral-700 text-neutral-400"
          }`}
        >
          <FilterIcon className="h-4 w-4" />
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-2 border border-neutral-800 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <DateField
              label="Start date"
              value={filters.dateFrom}
              onChange={(v) => setFilters({ ...filters, dateFrom: v })}
            />
            <DateField
              label="End date"
              value={filters.dateTo}
              onChange={(v) => setFilters({ ...filters, dateTo: v })}
            />
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Min total
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                className={`${inputClass} w-24`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Max total
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                className={`${inputClass} w-24`}
              />
            </label>
            <button
              type="button"
              disabled={!canApply}
              onClick={list.applyFilters}
              className="cursor-pointer border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:border-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-700"
            >
              Apply
            </button>
          </div>

          {invalidDateRange && (
            <p className="text-xs text-red-400">Start date can&apos;t be after end date.</p>
          )}
          {invalidAmountRange && (
            <p className="text-xs text-red-400">Min total can&apos;t be greater than max total.</p>
          )}
        </div>
      )}
    </div>
  );
};
