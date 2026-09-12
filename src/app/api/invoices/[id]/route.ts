import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices, type ConfidenceMap } from "@/db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maps the extraction/confidence field key (snake_case, matches
// invoice-extraction-schema.ts's EXTRACTION_FIELD_KEYS) to the Drizzle
// column it corrects. line_items is confirmable but not correctable here —
// editing individual line items would need a different, more involved UI
// (add/remove/edit rows) that's deliberately out of scope for now.
const EDITABLE_FIELD_COLUMNS = {
  vendor_name: invoices.vendorName,
  invoice_number: invoices.invoiceNumber,
  invoice_date: invoices.invoiceDate,
  due_date: invoices.dueDate,
  currency: invoices.currency,
  subtotal_amount: invoices.subtotalAmount,
  tax_amount: invoices.taxAmount,
  total_amount: invoices.totalAmount,
} as const;

type EditableField = keyof typeof EDITABLE_FIELD_COLUMNS;

function isEditableField(field: unknown): field is EditableField {
  return typeof field === "string" && field in EDITABLE_FIELD_COLUMNS;
}

export async function GET(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

    if (!row) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("Unexpected error fetching invoice", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
    }
    const { field, action, value } = body as Record<string, unknown>;

    if (action !== "confirm" && action !== "correct") {
      return NextResponse.json({ error: "action must be 'confirm' or 'correct'" }, { status: 400 });
    }
    if (typeof field !== "string") {
      return NextResponse.json({ error: "field is required" }, { status: 400 });
    }
    if (action === "correct" && !isEditableField(field)) {
      return NextResponse.json(
        { error: `Field '${field}' cannot be corrected directly (line items aren't editable here)` },
        { status: 400 },
      );
    }

    const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const confidence: ConfidenceMap = { ...(existing.confidence ?? {}) };
    confidence[field] = {
      score: 1,
      flagged: false,
      reason: action === "correct" ? "Corrected by reviewer" : "Confirmed correct by reviewer",
    };
    const needsReview = Object.values(confidence).some((f) => f.flagged);

    const setValues: Partial<typeof invoices.$inferInsert> = { confidence, needsReview };
    if (action === "correct" && isEditableField(field)) {
      const stringValue = value === null || value === undefined ? null : String(value);
      switch (field) {
        case "vendor_name":
          setValues.vendorName = stringValue;
          break;
        case "invoice_number":
          setValues.invoiceNumber = stringValue;
          break;
        case "invoice_date":
          setValues.invoiceDate = stringValue;
          break;
        case "due_date":
          setValues.dueDate = stringValue;
          break;
        case "currency":
          setValues.currency = stringValue;
          break;
        case "subtotal_amount":
          setValues.subtotalAmount = stringValue;
          break;
        case "tax_amount":
          setValues.taxAmount = stringValue;
          break;
        case "total_amount":
          setValues.totalAmount = stringValue;
          break;
      }
    }

    const [updated] = await db
      .update(invoices)
      .set(setValues)
      .where(eq(invoices.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Unexpected error updating invoice", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  try {
    const { id } = await ctx.params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    let existing;
    try {
      [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    } catch (error) {
      console.error("Failed to look up invoice before deletion", { id }, error);
      return NextResponse.json({ error: "Failed to look up invoice" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    try {
      await db.delete(invoices).where(eq(invoices.id, id));
    } catch (error) {
      console.error("Failed to delete invoice row", { id }, error);
      return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
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
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
