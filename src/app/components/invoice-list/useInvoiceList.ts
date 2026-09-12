import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EMPTY_FILTERS, type Filters, type InvoiceRow, type SortDirection, type SortKey } from "@/app/components/invoice-list/InvoiceList.types";
import { deleteInvoice, listInvoices, uploadInvoice } from "@/lib/api/api-client";
import { compareInvoices, validateFile } from "@/lib/invoice-list";

export const useInvoiceList = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dragActive, setDragActive] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstRun = useRef(true);
  const router = useRouter();

  const fetchInvoices = useCallback(async (f: Filters) => {
    try {
      const data = await listInvoices(f);
      setInvoices(data);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  // Live search: re-fetch as the vendor query changes, debounced so we're
  // not firing a request on every keystroke.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setLoadingList(true);
    const timeout = setTimeout(() => {
      fetchInvoices(filters);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on vendor query changes
  }, [filters.vendor]);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchInvoices(EMPTY_FILTERS);
  };

  const applyFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    applyFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    setUploading(true);
    try {
      await uploadInvoice(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setLoadingList(true);
      await fetchInvoices(filters);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: string) => {
    setListError(null);
    setDeletingId(id);
    try {
      await deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortKey) return invoices;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...invoices].sort((a, b) => compareInvoices(a, b, sortKey) * dir);
  }, [invoices, sortKey, sortDirection]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return {
    invoices,
    sortedInvoices,
    filters,
    setFilters,
    hasActiveFilters,
    clearFilters,
    loadingList,
    uploading,
    uploadError,
    selectedFile,
    listError,
    deletingId,
    sortKey,
    sortDirection,
    dragActive,
    setDragActive,
    confirmDeleteId,
    setConfirmDeleteId,
    fileInputRef,
    router,
    handleFileChange,
    handleDrop,
    handleUpload,
    handleSort,
    handleDelete,
  };
};

export type InvoiceListController = ReturnType<typeof useInvoiceList>;
