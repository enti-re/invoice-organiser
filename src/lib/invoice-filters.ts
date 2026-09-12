import { gte, ilike, lte, type SQL } from "drizzle-orm";

import { invoices } from "@/db/schema";
import { isValidIsoDate } from "@/lib/date";

export type InvoiceListParams = {
  vendor: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  minAmount: string | null;
  maxAmount: string | null;
};

export function parseInvoiceListParams(searchParams: URLSearchParams): InvoiceListParams {
  return {
    vendor: searchParams.get("vendor"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    minAmount: searchParams.get("minAmount"),
    maxAmount: searchParams.get("maxAmount"),
  };
}

export function validateInvoiceListParams({
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
}: InvoiceListParams): string | null {
  if (minAmount !== null && (minAmount.trim() === "" || Number.isNaN(Number(minAmount)))) {
    return "minAmount must be a number";
  }
  if (maxAmount !== null && (maxAmount.trim() === "" || Number.isNaN(Number(maxAmount)))) {
    return "maxAmount must be a number";
  }
  if (dateFrom !== null && !isValidIsoDate(dateFrom)) {
    return "dateFrom must be an ISO date (YYYY-MM-DD)";
  }
  if (dateTo !== null && !isValidIsoDate(dateTo)) {
    return "dateTo must be an ISO date (YYYY-MM-DD)";
  }
  return null;
}

export function buildInvoiceListConditions({
  vendor,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
}: InvoiceListParams): SQL[] {
  const conditions: SQL[] = [];
  if (vendor) conditions.push(ilike(invoices.vendorName, `%${vendor}%`));
  if (dateFrom) conditions.push(gte(invoices.invoiceDate, dateFrom));
  if (dateTo) conditions.push(lte(invoices.invoiceDate, dateTo));
  if (minAmount) conditions.push(gte(invoices.totalAmount, minAmount));
  if (maxAmount) conditions.push(lte(invoices.totalAmount, maxAmount));
  return conditions;
}
