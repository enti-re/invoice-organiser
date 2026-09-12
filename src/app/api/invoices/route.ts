import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { BlobError, BlobServiceRateLimited, put } from "@vercel/blob";
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
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("Unexpected error handling invoice upload", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

async function handlePost(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to parse multipart form data", error);
    return NextResponse.json({ error: "Malformed upload request" }, { status: 400 });
  }

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

  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
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
    if (error instanceof BlobServiceRateLimited) {
      return NextResponse.json(
        { error: "File storage is temporarily rate limited. Please try again shortly." },
        { status: 502 },
      );
    }
    if (error instanceof BlobError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Failed to store uploaded file" }, { status: 502 });
  }

  let extraction, rawResponse, model;
  try {
    ({ extraction, rawResponse, model } = await extractInvoice({
      base64Data: buffer.toString("base64"),
      mediaType,
    }));
  } catch (rawError) {
    console.error("Extraction failed", rawError);

    // generateObject wraps the real cause in RetryError.lastError once
    // internal retries are exhausted, rather than throwing it directly.
    const error = RetryError.isInstance(rawError) ? rawError.lastError : rawError;

    if (
      (error instanceof Error && error.name === "TimeoutError") ||
      (error instanceof Error && /timeout|timed out/i.test(error.message))
    ) {
      return NextResponse.json(
        { error: "Extraction timed out. Please try again.", fileUrl: blobUrl },
        { status: 502 },
      );
    }

    if (APICallError.isInstance(error)) {
      if (error.statusCode === 429) {
        return NextResponse.json(
          {
            error: "Extraction service is rate limited right now. Please try again shortly.",
            fileUrl: blobUrl,
          },
          { status: 502 },
        );
      }
      if (error.statusCode === 503) {
        return NextResponse.json(
          {
            error: "Extraction service is temporarily overloaded. Please try again shortly.",
            fileUrl: blobUrl,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: "Extraction service is unavailable right now. Please try again.", fileUrl: blobUrl },
        { status: 502 },
      );
    }

    if (NoObjectGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "Extraction did not return usable data for this document.", fileUrl: blobUrl },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Extraction failed", fileUrl: blobUrl }, { status: 502 });
  }

  const { confidence, needsReview } = computeConfidence(extraction);

  try {
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
  } catch (error) {
    console.error("Failed to save extracted invoice to the database", error);
    return NextResponse.json(
      { error: "Extraction succeeded but saving the invoice failed", fileUrl: blobUrl },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    return await handleGet(request);
  } catch (error) {
    console.error("Unexpected error handling invoice list request", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get("vendor");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  if (minAmount !== null && (minAmount.trim() === "" || Number.isNaN(Number(minAmount)))) {
    return NextResponse.json({ error: "minAmount must be a number" }, { status: 400 });
  }

  if (maxAmount !== null && (maxAmount.trim() === "" || Number.isNaN(Number(maxAmount)))) {
    return NextResponse.json({ error: "maxAmount must be a number" }, { status: 400 });
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (dateFrom !== null && !DATE_RE.test(dateFrom)) {
    return NextResponse.json({ error: "dateFrom must be an ISO date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (dateTo !== null && !DATE_RE.test(dateTo)) {
    return NextResponse.json({ error: "dateTo must be an ISO date (YYYY-MM-DD)" }, { status: 400 });
  }

  const conditions: SQL[] = [];
  if (vendor) conditions.push(ilike(invoices.vendorName, `%${vendor}%`));
  if (dateFrom) conditions.push(gte(invoices.invoiceDate, dateFrom));
  if (dateTo) conditions.push(lte(invoices.invoiceDate, dateTo));
  if (minAmount) conditions.push(gte(invoices.totalAmount, minAmount));
  if (maxAmount) conditions.push(lte(invoices.totalAmount, maxAmount));

  try {
    const rows = await db
      .select()
      .from(invoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to query invoices", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
