import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Filters } from "@/app/components/invoice-list/InvoiceList.types";
import { deleteInvoice, getInvoice, listInvoices, updateInvoiceField, uploadInvoice } from "../api-client";

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = ok ? 200 : 500 } = init;
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
};

const EMPTY_FILTERS: Filters = { vendor: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "" };

describe("api-client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listInvoices", () => {
    it("requests the invoices endpoint with only the active filters as query params", async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await listInvoices({ ...EMPTY_FILTERS, vendor: "Acme", minAmount: "10" });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/invoices?vendor=Acme&minAmount=10");
    });

    it("resolves with the parsed JSON array", async () => {
      const rows = [{ id: "1" }];
      fetchMock.mockResolvedValue(jsonResponse(rows));

      await expect(listInvoices(EMPTY_FILTERS)).resolves.toEqual(rows);
    });

    it("throws the server's error message on a non-ok response, instead of resolving with the error body", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error: "minAmount must be a number" }, { ok: false, status: 400 }),
      );

      await expect(listInvoices({ ...EMPTY_FILTERS, minAmount: "abc" })).rejects.toThrow(
        "minAmount must be a number",
      );
    });
  });

  describe("uploadInvoice", () => {
    it("POSTs a FormData body containing the file", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: "1" }, { status: 201 }));
      const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });

      await uploadInvoice(file);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/invoices");
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.body as FormData).get("file")).toBe(file);
    });

    it("throws the server's error message on a non-ok response", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: "File is too large. Maximum allowed size is 4MB." }, { ok: false, status: 400 }));
      const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });

      await expect(uploadInvoice(file)).rejects.toThrow("File is too large. Maximum allowed size is 4MB.");
    });

    it("falls back to a generic message when the error body can't be read", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("not json");
        },
      } as unknown as Response);
      const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });

      await expect(uploadInvoice(file)).rejects.toThrow("Upload failed (502)");
    });
  });

  describe("deleteInvoice", () => {
    it("sends a DELETE request to the invoice's URL", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ deleted: true, id: "1" }));

      await deleteInvoice("1");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/invoices/1");
      expect(init.method).toBe("DELETE");
    });

    it("throws on a non-ok response", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: "Invoice not found" }, { ok: false, status: 404 }));

      await expect(deleteInvoice("missing")).rejects.toThrow("Invoice not found");
    });
  });

  describe("getInvoice", () => {
    it("GETs the invoice's URL and resolves with the parsed JSON", async () => {
      const invoice = { id: "1", vendorName: "Acme" };
      fetchMock.mockResolvedValue(jsonResponse(invoice));

      await expect(getInvoice("1")).resolves.toEqual(invoice);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/invoices/1");
    });
  });

  describe("updateInvoiceField", () => {
    it("PATCHes with the field/action/value as a JSON body", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));

      await updateInvoiceField("1", "vendor_name", "correct", "Acme Corp");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/invoices/1");
      expect(init.method).toBe("PATCH");
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init.body)).toEqual({ field: "vendor_name", action: "correct", value: "Acme Corp" });
    });

    it("throws the server's error message on a non-ok response", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: "field is required" }, { ok: false, status: 400 }));

      await expect(updateInvoiceField("1", "", "confirm")).rejects.toThrow("field is required");
    });
  });
});
