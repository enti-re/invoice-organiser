import { describe, expect, it } from "vitest";

import { invalidUuidResponse, isValidUuid } from "../uuid";

const VALID_UUID = "52051054-1a66-4db0-a8b7-239fd00263b6";

describe("isValidUuid", () => {
  it("accepts a valid v4-shaped UUID", () => {
    expect(isValidUuid(VALID_UUID)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidUuid(VALID_UUID.toUpperCase())).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid("52051054-1a66-4db0-a8b7")).toBe(false);
  });
});

describe("invalidUuidResponse", () => {
  it("returns null for a valid id", () => {
    expect(invalidUuidResponse(VALID_UUID)).toBeNull();
  });

  it("returns a 400 response with the right error body for an invalid id", async () => {
    const response = invalidUuidResponse("not-a-uuid");

    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toEqual({ error: "Invalid invoice id" });
  });
});
