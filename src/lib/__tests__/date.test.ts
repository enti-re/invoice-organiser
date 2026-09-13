import { describe, expect, it } from "vitest";

import { formatIsoDate, isValidIsoDate, parseIsoDate } from "../date";

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

describe("formatIsoDate", () => {
  it("formats a local-time Date as YYYY-MM-DD", () => {
    expect(formatIsoDate(new Date(2026, 0, 15))).toBe("2026-01-15");
  });

  it("pads single-digit months and days", () => {
    expect(formatIsoDate(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("doesn't shift by a day near a UTC offset boundary", () => {
    // Constructed via local-time components (not a UTC string), so a
    // negative UTC offset can't roll it back to the previous day the way
    // toISOString() would for e.g. 2026-01-01 00:30 in a UTC-1 zone.
    const midnightLocal = new Date(2026, 0, 1, 0, 0, 0);
    expect(formatIsoDate(midnightLocal)).toBe("2026-01-01");
  });
});

describe("parseIsoDate", () => {
  it("round-trips through formatIsoDate for a valid date", () => {
    const date = parseIsoDate("2026-06-20");
    expect(date).toBeInstanceOf(Date);
    expect(formatIsoDate(date as Date)).toBe("2026-06-20");
  });

  it("returns undefined for an invalid date, reusing isValidIsoDate's rules", () => {
    expect(parseIsoDate("2024-02-30")).toBeUndefined();
    expect(parseIsoDate("not a date")).toBeUndefined();
    expect(parseIsoDate("")).toBeUndefined();
  });

  it("parses in local time, not UTC", () => {
    const date = parseIsoDate("2026-01-01") as Date;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });
});
