import { describe, expect, it } from "vitest";

import {
  buildInvoiceListConditions,
  parseInvoiceListParams,
  validateInvoiceListParams,
} from "../invoice-filters";

describe("parseInvoiceListParams", () => {
  it("reads all five params when present", () => {
    const searchParams = new URLSearchParams({
      vendor: "Acme",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      minAmount: "10",
      maxAmount: "500",
    });

    expect(parseInvoiceListParams(searchParams)).toEqual({
      vendor: "Acme",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      minAmount: "10",
      maxAmount: "500",
    });
  });

  it("returns null for every absent param", () => {
    expect(parseInvoiceListParams(new URLSearchParams())).toEqual({
      vendor: null,
      dateFrom: null,
      dateTo: null,
      minAmount: null,
      maxAmount: null,
    });
  });
});

describe("validateInvoiceListParams", () => {
  const base = { vendor: null, dateFrom: null, dateTo: null, minAmount: null, maxAmount: null };

  it("returns null when every present param is valid", () => {
    expect(
      validateInvoiceListParams({ ...base, minAmount: "10", maxAmount: "500", dateFrom: "2026-01-01" }),
    ).toBeNull();
  });

  it("returns null when every param is absent", () => {
    expect(validateInvoiceListParams(base)).toBeNull();
  });

  it("flags a non-numeric minAmount", () => {
    expect(validateInvoiceListParams({ ...base, minAmount: "abc" })).toBe("minAmount must be a number");
  });

  it("flags a non-numeric maxAmount", () => {
    expect(validateInvoiceListParams({ ...base, maxAmount: "abc" })).toBe("maxAmount must be a number");
  });

  it("flags an invalid dateFrom", () => {
    expect(validateInvoiceListParams({ ...base, dateFrom: "01/01/2026" })).toBe(
      "dateFrom must be an ISO date (YYYY-MM-DD)",
    );
  });

  it("flags an invalid dateTo", () => {
    expect(validateInvoiceListParams({ ...base, dateTo: "2026-02-30" })).toBe(
      "dateTo must be an ISO date (YYYY-MM-DD)",
    );
  });
});

describe("buildInvoiceListConditions", () => {
  const base = { vendor: null, dateFrom: null, dateTo: null, minAmount: null, maxAmount: null };

  it("produces no conditions when no filters are active", () => {
    expect(buildInvoiceListConditions(base)).toHaveLength(0);
  });

  it("produces one condition per active filter", () => {
    expect(buildInvoiceListConditions({ ...base, vendor: "Acme" })).toHaveLength(1);
    expect(
      buildInvoiceListConditions({ ...base, dateFrom: "2026-01-01", dateTo: "2026-01-31" }),
    ).toHaveLength(2);
  });

  it("produces a condition for every filter when all are active", () => {
    expect(
      buildInvoiceListConditions({
        vendor: "Acme",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        minAmount: "10",
        maxAmount: "500",
      }),
    ).toHaveLength(5);
  });
});
