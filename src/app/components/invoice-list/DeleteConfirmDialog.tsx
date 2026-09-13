import { useEffect } from "react";

import { useFocusTrap } from "@/app/components/useFocusTrap";
import type { InvoiceListController } from "@/app/components/invoice-list/useInvoiceList";
import { Spinner } from "@/app/components/icons";

export const DeleteConfirmDialog = ({ list }: { list: InvoiceListController }) => {
  const open = Boolean(list.confirmDeleteId);
  const isDeleting = list.deletingId === list.confirmDeleteId;
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) list.setConfirmDeleteId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list is a stable controller object, not real reactive state
  }, [open, isDeleting]);

  if (!open) return null;

  const vendorName = list.invoices.find((inv) => inv.id === list.confirmDeleteId)?.vendorName ?? "This invoice";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => !isDeleting && list.setConfirmDeleteId(null)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        tabIndex={-1}
        className="w-full max-w-sm border border-neutral-800 bg-neutral-900 p-6 space-y-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h3 id="delete-dialog-title" className="font-medium text-neutral-100">
            Delete this invoice?
          </h3>
          <p className="text-sm text-neutral-400">
            {vendorName} will be permanently removed. This can&apos;t be undone.
          </p>
          {list.listError && (
            <p role="alert" className="text-sm text-red-400">
              {list.listError}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => list.setConfirmDeleteId(null)}
            disabled={isDeleting}
            className="cursor-pointer border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => list.handleDelete(list.confirmDeleteId!)}
            disabled={isDeleting}
            className="flex cursor-pointer items-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting && <Spinner className="h-4 w-4" />}
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
