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

  it("clearFilters shows the loading state even when vendor was never set", async () => {
    // Regression: with only an advanced filter active (vendor untouched),
    // changing filters.vendor from "" to "" doesn't re-trigger the
    // vendor-watching debounce effect, so clearFilters must flip
    // loadingList itself -- otherwise the list briefly shows a stale
    // "no invoices" state instead of a skeleton while the re-fetch is
    // still in flight.
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() => result.current.setFilters((f) => ({ ...f, minAmount: "500" })));
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.loadingList).toBe(true);
  });

  it("applyFilters fetches with the current filters and shows loading", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() => result.current.setFilters((f) => ({ ...f, minAmount: "500" })));

    const callsBefore = fetchMock.mock.calls.length;
    act(() => result.current.applyFilters());

    expect(result.current.loadingList).toBe(true);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
    const [url] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(url).toBe("/api/invoices?minAmount=500");
  });

  it("clearAdvancedFilters clears only date/amount fields, leaving vendor untouched", async () => {
    const { result } = renderHook(() => useInvoiceList());
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    act(() =>
      result.current.setFilters((f) => ({ ...f, vendor: "Acme", minAmount: "500", dateFrom: "2026-01-01" })),
    );
    await waitFor(() => expect(result.current.loadingList).toBe(false));

    // clearAdvancedFilters leaves filters.vendor as "Acme" (unchanged), so
    // unlike the setup above, this call doesn't retrigger the
    // vendor-watching debounce effect -- isolating clearAdvancedFilters'
    // own loadingList(true) as the thing actually under test here.
    act(() => result.current.clearAdvancedFilters());

    expect(result.current.filters.vendor).toBe("Acme");
    expect(result.current.filters.minAmount).toBe("");
    expect(result.current.filters.dateFrom).toBe("");
    expect(result.current.loadingList).toBe(true);

    await waitFor(() => expect(result.current.loadingList).toBe(false));
    const [url] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(url).toBe("/api/invoices?vendor=Acme");
  });
});
