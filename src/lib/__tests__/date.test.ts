import { describe, expect, it } from "vitest";

import { isValidIsoDate } from "../date";

describe("isValidIsoDate", () => {
  it("accepts a valid ISO date", () => {
    expect(isValidIsoDate("2026-01-15")).toBe(true);
  });

  it("accepts a real leap-year date", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
  });

  it("rejects a value that isn't in YYYY-MM-DD format", () => {
    expect(isValidIsoDate("15/01/2026")).toBe(false);
    expect(isValidIsoDate("2026-1-15")).toBe(false);
    expect(isValidIsoDate("not a date")).toBe(false);
  });

  it("rejects a calendar-invalid date even in the right format", () => {
    expect(isValidIsoDate("2024-02-30")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
  });

  it("rejects Feb 29 on a non-leap year", () => {
    expect(isValidIsoDate("2025-02-29")).toBe(false);
  });
});
