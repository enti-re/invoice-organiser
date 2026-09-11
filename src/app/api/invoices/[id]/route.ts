import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices } from "@/db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
