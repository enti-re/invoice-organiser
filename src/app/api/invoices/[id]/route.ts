import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices, type ConfidenceMap } from "@/db/schema";
import { COMMON_ERRORS, INVOICE_ERRORS, REVIEW_REASONS } from "@/lib/api-messages";
import { fail, type StepFailure } from "@/lib/api-step";
import { buildFieldUpdate, isEditableField } from "@/lib/invoice-fields";
import { invalidUuidResponse } from "@/lib/uuid";

type PatchAction = "confirm" | "correct";
type PatchRequest =
  | { ok: true; field: string; action: PatchAction; value: unknown }
  | StepFailure;
type InvoiceLookup = { ok: true; invoice: typeof invoices.$inferSelect } | StepFailure;

// ---- GET /api/invoices/[id] ----

async function handleGet(id: string) {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

  if (!row) {
    return NextResponse.json({ error: COMMON_ERRORS.invoiceNotFound }, { status: 404 });
  }

  return NextResponse.json(row);
}

// ---- PATCH /api/invoices/[id] ----

async function parsePatchRequest(request: Request): Promise<PatchRequest> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(INVOICE_ERRORS.malformedBody, 400);
  }

  if (typeof body !== "object" || body === null) {
    return fail(INVOICE_ERRORS.malformedBody, 400);
  }
  const { field, action, value } = body as Record<string, unknown>;

  if (action !== "confirm" && action !== "correct") {
    return fail(INVOICE_ERRORS.invalidAction, 400);
  }
  if (typeof field !== "string") {
    return fail(INVOICE_ERRORS.fieldRequired, 400);
  }
  if (action === "correct" && !isEditableField(field)) {
    return fail(INVOICE_ERRORS.fieldNotEditable(field), 400);
  }

  return { ok: true, field, action, value };
}

function buildPatchValues(
  existing: typeof invoices.$inferSelect,
  field: string,
  action: PatchAction,
  value: unknown,
): Partial<typeof invoices.$inferInsert> {
  const confidence: ConfidenceMap = { ...(existing.confidence ?? {}) };
  confidence[field] = {
    score: 1,
    flagged: false,
    reason: action === "correct" ? REVIEW_REASONS.corrected : REVIEW_REASONS.confirmed,
  };
  const needsReview = Object.values(confidence).some((f) => f.flagged);

  const setValues: Partial<typeof invoices.$inferInsert> = { confidence, needsReview };
  if (action === "correct" && isEditableField(field)) {
    Object.assign(setValues, buildFieldUpdate(field, value));
  }
  return setValues;
}

async function handlePatch(request: Request, id: string) {
  const parsed = await parsePatchRequest(request);
  if (!parsed.ok) return parsed.response;
  const { field, action, value } = parsed;

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: COMMON_ERRORS.invoiceNotFound }, { status: 404 });
  }

  const setValues = buildPatchValues(existing, field, action, value);

  const [updated] = await db.update(invoices).set(setValues).where(eq(invoices.id, id)).returning();

  return NextResponse.json(updated);
}

// ---- DELETE /api/invoices/[id] ----

async function findInvoiceOrFail(id: string): Promise<InvoiceLookup> {
  let invoice;
  try {
    [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  } catch (error) {
    console.error("Failed to look up invoice before deletion", { id }, error);
    return fail(INVOICE_ERRORS.lookupFailed, 500);
  }

  if (!invoice) {
    return fail(COMMON_ERRORS.invoiceNotFound, 404);
  }

  return { ok: true, invoice };
}

async function deleteInvoiceRow(id: string): Promise<StepFailure | { ok: true }> {
  try {
    await db.delete(invoices).where(eq(invoices.id, id));
    return { ok: true };
  } catch (error) {
    console.error("Failed to delete invoice row", { id }, error);
    return fail(INVOICE_ERRORS.deleteFailed, 500);
  }
}

async function deleteInvoiceBlob(fileUrl: string, id: string): Promise<void> {
  try {
    await del(fileUrl);
  } catch (error) {
    // The DB row is already gone, which is what the caller asked for.
    // A leftover blob is an orphaned-file cleanup concern, not a request failure.
    console.error("Failed to delete blob for invoice (row already deleted)", { id, fileUrl, error });
  }
}

async function handleDelete(id: string) {
  const found = await findInvoiceOrFail(id);
  if (!found.ok) return found.response;

  const deleted = await deleteInvoiceRow(id);
  if (!deleted.ok) return deleted.response;

  await deleteInvoiceBlob(found.invoice.fileUrl, id);

  return NextResponse.json({ deleted: true, id });
}

// ---- Route entry points ----

export async function GET(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;
    const badId = invalidUuidResponse(id);
    if (badId) return badId;

    return await handleGet(id);
  } catch (error) {
    console.error("Unexpected error fetching invoice", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;
    const badId = invalidUuidResponse(id);
    if (badId) return badId;

    return await handlePatch(request, id);
  } catch (error) {
    console.error("Unexpected error updating invoice", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;
    const badId = invalidUuidResponse(id);
    if (badId) return badId;

    return await handleDelete(id);
  } catch (error) {
    console.error("Unexpected error handling invoice deletion", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}
