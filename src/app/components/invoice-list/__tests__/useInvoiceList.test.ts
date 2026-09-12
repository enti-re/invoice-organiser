// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InvoiceRow } from "@/app/components/invoice-list/InvoiceList.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { useInvoiceList } from "../useInvoiceList";

const makeRow = (overrides: Partial<InvoiceRow> = {}): InvoiceRow => ({
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
  confidence: null,
  needsReview: false,
  ...overrides,
});

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

describe("useInvoiceList", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads invoices on mount", async () => {
    const rows = [makeRow({ id: "1" }), makeRow({ id: "2" })];
    fetchMock.mockResolvedValue(jsonResponse(rows));

    const { result } = renderHook(() => useInvoiceList());

    expect(result.current.loadingList).toBe(true);

    await waitFor(() => expect(result.current.loadingList).toBe(false));
    expect(result.current.invoices).toEqual(rows);
    expect(result.current.sortedInvoices).toEqual(rows);
  });

  it("sorts ascending on the first click of a column and toggles on the second", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() => result.current.handleSort("vendorName"));
    expect(result.current.sortKey).toBe("vendorName");
    expect(result.current.sortDirection).toBe("asc");

    act(() => result.current.handleSort("vendorName"));
    expect(result.current.sortDirection).toBe("desc");
  });

  it("resets sort direction to asc when switching to a different column", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() => result.current.handleSort("vendorName"));
    act(() => result.current.handleSort("vendorName"));
    expect(result.current.sortDirection).toBe("desc");

    act(() => result.current.handleSort("totalAmount"));
    expect(result.current.sortKey).toBe("totalAmount");
    expect(result.current.sortDirection).toBe("asc");
  });

  it("reports hasActiveFilters correctly", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.setFilters((f) => ({ ...f, vendor: "Acme" })));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("clearFilters resets filters and re-fetches", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() => result.current.setFilters((f) => ({ ...f, vendor: "Acme" })));
    expect(result.current.hasActiveFilters).toBe(true);

    const callsBefore = fetchMock.mock.calls.length;
    act(() => result.current.clearFilters());

    expect(result.current.hasActiveFilters).toBe(false);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
