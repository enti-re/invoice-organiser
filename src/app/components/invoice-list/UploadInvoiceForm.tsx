import type { InvoiceListController } from "@/app/components/invoice-list/useInvoiceList";
import { FileIcon, Spinner, UploadIcon } from "@/app/components/icons";
import { ACCEPTED_FILE_TYPES } from "@/lib/invoice-list";

export const UploadInvoiceForm = ({ list }: { list: InvoiceListController }) => {
  const { fileInputRef } = list;
  return (
    <section className="space-y-3">
      <h2 className="font-medium text-neutral-100">Upload an invoice</h2>
      <form onSubmit={list.handleUpload}>
        <div
          onClick={() => !list.uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!list.uploading) list.setDragActive(true);
          }}
          onDragLeave={() => list.setDragActive(false)}
          onDrop={(e) => !list.uploading && list.handleDrop(e)}
          className={`flex flex-col items-center justify-center gap-3 border p-10 text-center transition-colors ${
            list.uploading
              ? "cursor-not-allowed border-neutral-800 opacity-60"
              : "cursor-pointer border-neutral-800 hover:border-neutral-600"
          } ${list.dragActive && !list.uploading ? "border-white bg-neutral-900" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            onChange={list.handleFileChange}
            disabled={list.uploading}
            className="hidden"
          />
          {list.uploading ? (
            <>
              <Spinner className="h-6 w-6 text-neutral-400" />
              <p className="font-medium text-neutral-100">Extracting fields…</p>
              <p className="text-sm text-neutral-400">
                Our AI agent is reading the document. This may take up to a minute.
              </p>
            </>
          ) : list.selectedFile ? (
            <>
              <FileIcon className="w-6 h-6 text-neutral-400" />
              <p className="font-medium text-neutral-100">{list.selectedFile.name}</p>
              <p className="text-sm text-neutral-400">
                {(list.selectedFile.size / 1024).toFixed(0)} KB — click or drop to replace
              </p>
            </>
          ) : (
            <>
              <UploadIcon className="w-6 h-6 text-neutral-400" />
              <p className="font-medium text-neutral-100">Drop an invoice here, or click to browse</p>
              <p className="text-sm text-neutral-400">PDF, PNG, JPEG, or WEBP — up to 15MB</p>
            </>
          )}
        </div>
        {list.uploading && (
          <div className="mt-2 h-1 w-full overflow-hidden bg-neutral-800">
            <div className="h-full w-1/3 animate-indeterminate bg-white" />
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            disabled={list.uploading || !list.selectedFile}
            className="flex items-center gap-2 cursor-pointer bg-white text-black text-sm px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-30"
          >
            {list.uploading && <Spinner className="h-4 w-4" />}
            {list.uploading ? "Extracting…" : "Upload & extract"}
          </button>
          {list.uploadError && <p className="text-sm text-red-400">{list.uploadError}</p>}
        </div>
      </form>
    </section>
  );
};
