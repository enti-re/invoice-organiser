import { put } from "@vercel/blob";
import { and, desc, gte, ilike, lte, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { computeConfidence } from "@/lib/confidence";
import { extractInvoice, type SupportedMediaType } from "@/lib/extract";

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably above any real single-page invoice

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!SUPPORTED_MEDIA_TYPES.includes(file.type as SupportedMediaType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Expected PDF, PNG, JPEG, or WEBP.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mediaType = file.type as SupportedMediaType;

  let blobUrl: string;
  try {
    const blob = await put(`invoices/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      contentType: mediaType,
    });
    blobUrl = blob.url;
  } catch (error) {
    console.error("Blob upload failed", error);
    return NextResponse.json({ error: "Failed to store uploaded file" }, { status: 502 });
  }

  let extraction, rawResponse, model;
  try {
    ({ extraction, rawResponse, model } = await extractInvoice({
      base64Data: buffer.toString("base64"),
      mediaType,
    }));
  } catch (error) {
    console.error("Extraction failed", error);
    return NextResponse.json({ error: "Extraction failed", fileUrl: blobUrl }, { status: 502 });
  }

  const { confidence, needsReview } = computeConfidence(extraction);

  const [created] = await db
    .insert(invoices)
    .values({
      fileName: file.name,
      fileUrl: blobUrl,
      vendorName: extraction.vendor_name,
      invoiceNumber: extraction.invoice_number,
      invoiceDate: extraction.invoice_date,
      dueDate: extraction.due_date,
      currency: extraction.currency,
      subtotalAmount: extraction.subtotal_amount?.toString(),
      taxAmount: extraction.tax_amount?.toString(),
      totalAmount: extraction.total_amount?.toString(),
      lineItems: extraction.line_items,
      confidence,
      needsReview,
      rawExtraction: rawResponse as object,
      extractionModel: model,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get("vendor");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  const conditions: SQL[] = [];
  if (vendor) conditions.push(ilike(invoices.vendorName, `%${vendor}%`));
  if (dateFrom) conditions.push(gte(invoices.invoiceDate, dateFrom));
  if (dateTo) conditions.push(lte(invoices.invoiceDate, dateTo));
  if (minAmount) conditions.push(gte(invoices.totalAmount, minAmount));
  if (maxAmount) conditions.push(lte(invoices.totalAmount, maxAmount));

  const rows = await db
    .select()
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json(rows);
}
