"use client";

import Link from "next/link";

import { DeleteConfirmDialog } from "@/app/components/invoice-list/DeleteConfirmDialog";
import { FilterBar } from "@/app/components/invoice-list/FilterBar";
import { InvoiceCards } from "@/app/components/invoice-list/InvoiceCards";
import { InvoiceTable } from "@/app/components/invoice-list/InvoiceTable";
import { UploadInvoiceForm } from "@/app/components/invoice-list/UploadInvoiceForm";
import { useInvoiceList } from "@/app/components/invoice-list/useInvoiceList";

const Home = () => {
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

        <FilterBar list={list} />

        {list.listError && <p className="text-sm text-red-400">{list.listError}</p>}

        <InvoiceTable list={list} />
        <InvoiceCards list={list} />
      </section>

      <DeleteConfirmDialog list={list} />
    </div>
  );
};

export default Home;
