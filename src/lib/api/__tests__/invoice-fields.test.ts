import { describe, expect, it } from "vitest";

import { buildFieldUpdate, isEditableField } from "../invoice-fields";

describe("isEditableField", () => {
  it("accepts each known editable field", () => {
    expect(isEditableField("vendor_name")).toBe(true);
    expect(isEditableField("invoice_number")).toBe(true);
    expect(isEditableField("total_amount")).toBe(true);
  });

  it("rejects a field that isn't directly editable", () => {
    expect(isEditableField("line_items")).toBe(false);
    expect(isEditableField("document_type")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isEditableField(null)).toBe(false);
    expect(isEditableField(undefined)).toBe(false);
    expect(isEditableField(42)).toBe(false);
  });
});

describe("buildFieldUpdate", () => {
  it("maps vendor_name to the vendorName column", () => {
    expect(buildFieldUpdate("vendor_name", "Acme Corp")).toEqual({ vendorName: "Acme Corp" });
  });

  it("maps total_amount to the totalAmount column", () => {
    expect(buildFieldUpdate("total_amount", "110")).toEqual({ totalAmount: "110" });
  });

  it("stringifies a non-string value", () => {
    expect(buildFieldUpdate("total_amount", 110)).toEqual({ totalAmount: "110" });
  });

  it("maps a null value to a null column value", () => {
    expect(buildFieldUpdate("due_date", null)).toEqual({ dueDate: null });
  });

  it("maps an undefined value to a null column value", () => {
    expect(buildFieldUpdate("due_date", undefined)).toEqual({ dueDate: null });
  });
});
