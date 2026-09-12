import { describe, expect, it } from "vitest";

import type { ConfidenceMap } from "@/db/schema";
import { fieldState } from "../field-review";

describe("fieldState", () => {
  it("is not flagged and not missing when there's no confidence entry", () => {
    expect(fieldState(null, "vendor_name", true)).toEqual({
      flagged: false,
      missing: false,
      reason: undefined,
    });
  });

  it("is not flagged when the field's confidence entry says so", () => {
    const confidence: ConfidenceMap = {
      vendor_name: { score: 1, flagged: false, reason: "Looks correct" },
    };
    expect(fieldState(confidence, "vendor_name", true)).toEqual({
      flagged: false,
      missing: false,
      reason: "Looks correct",
    });
  });

  it("is flagged but not missing when flagged and a value is present", () => {
    const confidence: ConfidenceMap = {
      vendor_name: { score: 0.5, flagged: true, reason: "Looks like a placeholder" },
    };
    expect(fieldState(confidence, "vendor_name", true)).toEqual({
      flagged: true,
      missing: false,
      reason: "Looks like a placeholder",
    });
  });

  it("is flagged and missing when flagged and no value is present", () => {
    const confidence: ConfidenceMap = {
      vendor_name: { score: 0, flagged: true, reason: "Unable to extract" },
    };
    expect(fieldState(confidence, "vendor_name", false)).toEqual({
      flagged: true,
      missing: true,
      reason: "Unable to extract",
    });
  });

  it("looks up the confidence entry by the given key only", () => {
    const confidence: ConfidenceMap = {
      vendor_name: { score: 0, flagged: true, reason: "Unable to extract" },
    };
    expect(fieldState(confidence, "invoice_number", true)).toEqual({
      flagged: false,
      missing: false,
      reason: undefined,
    });
  });
});
