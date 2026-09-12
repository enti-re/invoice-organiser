import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUuid = (value: string): boolean => {
  return UUID_RE.test(value);
};

// Route handlers all need the same "bad id -> 400" guard; centralizing it
// avoids repeating the same if-block in GET/PATCH/DELETE.
export const invalidUuidResponse = (value: string): NextResponse | null => {
  return isValidUuid(value) ? null : NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
};
