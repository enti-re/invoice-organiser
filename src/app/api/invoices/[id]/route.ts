import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices, type ConfidenceMap } from "@/db/schema";
import { COMMON_ERRORS, INVOICE_ERRORS, REVIEW_REASONS } from "@/lib/api-messages";
import { buildFieldUpdate, isEditableField } from "@/lib/invoice-fields";
import { invalidUuidResponse } from "@/lib/uuid";

export async function GET(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;

    const badId = invalidUuidResponse(id);
    if (badId) return badId;

    const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

    if (!row) {
      return NextResponse.json({ error: COMMON_ERRORS.invoiceNotFound }, { status: 404 });
    }

    return NextResponse.json(row);
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: INVOICE_ERRORS.malformedBody }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: INVOICE_ERRORS.malformedBody }, { status: 400 });
    }
    const { field, action, value } = body as Record<string, unknown>;

    if (action !== "confirm" && action !== "correct") {
      return NextResponse.json({ error: INVOICE_ERRORS.invalidAction }, { status: 400 });
    }
    if (typeof field !== "string") {
      return NextResponse.json({ error: INVOICE_ERRORS.fieldRequired }, { status: 400 });
    }
    if (action === "correct" && !isEditableField(field)) {
      return NextResponse.json({ error: INVOICE_ERRORS.fieldNotEditable(field) }, { status: 400 });
    }

    const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: COMMON_ERRORS.invoiceNotFound }, { status: 404 });
    }

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

    const [updated] = await db
      .update(invoices)
      .set(setValues)
      .where(eq(invoices.id, id))
      .returning();

    return NextResponse.json(updated);
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

    let existing;
    try {
      [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    } catch (error) {
      console.error("Failed to look up invoice before deletion", { id }, error);
      return NextResponse.json({ error: INVOICE_ERRORS.lookupFailed }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: COMMON_ERRORS.invoiceNotFound }, { status: 404 });
    }

    try {
      await db.delete(invoices).where(eq(invoices.id, id));
    } catch (error) {
      console.error("Failed to delete invoice row", { id }, error);
      return NextResponse.json({ error: INVOICE_ERRORS.deleteFailed }, { status: 500 });
    }

    try {
      await del(existing.fileUrl);
    } catch (error) {
      // The DB row is already gone, which is what the caller asked for.
      // A leftover blob is an orphaned-file cleanup concern, not a request failure.
      console.error("Failed to delete blob for invoice (row already deleted)", {
        id,
        fileUrl: existing.fileUrl,
        error,
      });
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Unexpected error handling invoice deletion", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}
