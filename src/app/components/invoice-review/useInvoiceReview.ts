import { useEffect, useRef, useState } from "react";

import type { InvoiceData } from "@/app/components/invoice-review/InvoiceReview.types";
import { getInvoice, updateInvoiceField } from "@/lib/api/api-client";

export function useInvoiceReview(id: string) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandedField) return;
    function onDocClick(e: MouseEvent) {
      if (expandedPanelRef.current && !expandedPanelRef.current.contains(e.target as Node)) {
        setExpandedField(null);
        setEditingField(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setExpandedField(null);
        setEditingField(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expandedField]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setInvoice(null);
      setLoadError(null);
      setShowOriginal(true);
      setExpandedField(null);
      setEditingField(null);
      try {
        const data = await getInvoice(id);
        if (cancelled) return;
        setInvoice(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submitPatch(
    field: string,
    action: "confirm" | "correct",
    value?: string,
  ): Promise<boolean> {
    setActionError(null);
    setSavingField(field);
    try {
      const updated = await updateInvoiceField(id, field, action, value);
      setInvoice(updated);
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
      return false;
    } finally {
      setSavingField(null);
    }
  }

  function toggleExpand(key: string) {
    setExpandedField((f) => (f === key ? null : key));
    setEditingField(null);
    setActionError(null);
  }

  function startEdit(key: string, value: string | null) {
    setEditingField(key);
    setEditValue(value ?? "");
  }

  async function handleConfirm(key: string) {
    const ok = await submitPatch(key, "confirm");
    if (ok) setExpandedField(null);
  }

  async function handleSave(key: string) {
    const ok = await submitPatch(key, "correct", editValue);
    if (ok) {
      setExpandedField(null);
      setEditingField(null);
    }
  }

  return {
    invoice,
    loading,
    loadError,
    showOriginal,
    setShowOriginal,
    expandedField,
    expandedPanelRef,
    editingField,
    setEditingField,
    editValue,
    setEditValue,
    savingField,
    actionError,
    toggleExpand,
    startEdit,
    handleConfirm,
    handleSave,
  };
}

export type InvoiceReviewController = ReturnType<typeof useInvoiceReview>;
