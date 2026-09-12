"use client";

import Link from "next/link";

import { DeleteConfirmDialog } from "@/app/components/invoice-list/DeleteConfirmDialog";
import { InvoiceCards } from "@/app/components/invoice-list/InvoiceCards";
import { InvoiceTable } from "@/app/components/invoice-list/InvoiceTable";
import { SearchIcon } from "@/app/components/icons";
import { UploadInvoiceForm } from "@/app/components/invoice-list/UploadInvoiceForm";
import { useInvoiceList } from "@/app/components/invoice-list/useInvoiceList";

export default function Home() {
  const list = useInvoiceList();

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-6 py-12 md:px-8 md:py-16 space-y-14">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">Invoice Organiser</h1>
          <Link href="/" className="shrink-0 cursor-pointer text-sm text-neutral-400 hover:text-white">
            Home
          </Link>
        </div>
        <p className="text-base text-neutral-400 max-w-2xl leading-relaxed">
          Upload an invoice and let the fields extract automatically. Only rows marked{" "}
          <span className="text-red-400 font-medium">Needs review</span> require a second look.
        </p>
      </header>

      <UploadInvoiceForm list={list} />

      <section className="space-y-4">
        <h2 className="font-medium text-neutral-100">Invoices</h2>

        <div className="border-b border-neutral-800 pb-5 text-sm">
          <div className="relative max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              placeholder="Search by vendor…"
              value={list.filters.vendor}
              onChange={(e) => list.setFilters({ ...list.filters, vendor: e.target.value })}
              className="w-full border border-neutral-700 py-2 pl-9 pr-9 focus:outline-none focus:border-white"
            />
            {list.filters.vendor && (
              <button
                type="button"
                onClick={list.clearFilters}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <InvoiceTable list={list} />
        <InvoiceCards list={list} />
      </section>

      <DeleteConfirmDialog list={list} />
    </div>
  );
}
