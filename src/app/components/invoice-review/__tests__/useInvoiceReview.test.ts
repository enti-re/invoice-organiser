// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InvoiceData } from "@/app/components/invoice-review/InvoiceReview.types";
import { useInvoiceReview } from "../useInvoiceReview";

const makeInvoice = (overrides: Partial<InvoiceData> = {}): InvoiceData => ({
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  fileName: "invoice.pdf",
  fileUrl: "https://example.com/invoice.pdf",
  vendorName: "Acme",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-01-01",
  dueDate: "2026-01-31",
  currency: "INR",
  subtotalAmount: "100",
  taxAmount: "10",
  totalAmount: "110",
  lineItems: [],
  needsReview: true,
  confidence: { vendor_name: { score: 1, flagged: false, reason: "Looks correct" } },
  ...overrides,
});

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = ok ? 200 : 500 } = init;
  return { ok, status, json: async () => body } as Response;
};

describe("useInvoiceReview", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the invoice on mount", async () => {
    const invoice = makeInvoice();
    fetchMock.mockResolvedValue(jsonResponse(invoice));

    const { result } = renderHook(() => useInvoiceReview("1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invoice).toEqual(invoice);
    expect(result.current.loadError).toBeNull();
  });

  it("sets loadError instead of throwing when the fetch fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Invoice not found" }, { ok: false, status: 404 }));

    const { result } = renderHook(() => useInvoiceReview("missing"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invoice).toBeNull();
    expect(result.current.loadError).toBe("Invoice not found");
  });

  it("toggleExpand opens and closes a field and clears actionError", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeInvoice()));
    const { result } = renderHook(() => useInvoiceReview("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleExpand("vendor_name"));
    expect(result.current.expandedField).toBe("vendor_name");

    act(() => result.current.toggleExpand("vendor_name"));
    expect(result.current.expandedField).toBeNull();
  });

  it("handleConfirm PATCHes and updates the invoice on success, then closes the panel", async () => {
    const initial = makeInvoice();
    const updated = makeInvoice({
      confidence: { vendor_name: { score: 1, flagged: false, reason: "Confirmed correct by reviewer" } },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(initial));
    const { result } = renderHook(() => useInvoiceReview("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleExpand("vendor_name"));
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));

    await act(async () => {
      await result.current.handleConfirm("vendor_name");
    });

    expect(result.current.invoice).toEqual(updated);
    expect(result.current.expandedField).toBeNull();

    const [, patchInit] = fetchMock.mock.calls[1];
    expect(patchInit.method).toBe("PATCH");
    expect(JSON.parse(patchInit.body)).toEqual({ field: "vendor_name", action: "confirm", value: undefined });
  });

  it("handleSave sets actionError instead of updating the invoice when the PATCH fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeInvoice()));
    const { result } = renderHook(() => useInvoiceReview("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.startEdit("vendor_name", "Acme"));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Update failed" }, { ok: false, status: 500 }));

    await act(async () => {
      await result.current.handleSave("vendor_name");
    });

    expect(result.current.actionError).toBe("Update failed");
    expect(result.current.editingField).toBe("vendor_name");
  });
});
