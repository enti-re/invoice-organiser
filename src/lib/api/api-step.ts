import { NextResponse } from "next/server";

// Shared shape for a multi-step handler: each step returns its value or a
// ready-to-return error response, so the caller just checks `.ok`.
export type StepFailure = { ok: false; response: NextResponse };

export const fail = (message: string, status: number): StepFailure => {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
};
