import { BlobError, BlobServiceRateLimited, put } from "@vercel/blob";
import { and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { COMMON_ERRORS, LIST_ERRORS, UPLOAD_ERRORS } from "@/lib/api/api-messages";
import { fail, type StepFailure } from "@/lib/api/api-step";
import {
  buildInvoiceListConditions,
  parseInvoiceListParams,
  validateInvoiceListParams,
} from "@/lib/api/invoice-filters";
import { computeConfidence } from "@/lib/extraction/confidence";
import { extractInvoice, type SupportedMediaType } from "@/lib/extraction/extract";
import { mapExtractionErrorToResponse } from "@/lib/extraction/extraction-error-response";
import type { InvoiceExtraction } from "@/lib/extraction/invoice-extraction-schema";

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably above any real single-page invoice

type FileValidation = { ok: true; file: File } | StepFailure;
type BlobUpload = { ok: true; blobUrl: string } | StepFailure;

// ---- POST /api/invoices — upload, extract, save ----

function validateUploadedFile(entry: FormDataEntryValue | null): FileValidation {
  if (!(entry instanceof File)) {
    return fail(UPLOAD_ERRORS.missingFile, 400);
  }
  if (!SUPPORTED_MEDIA_TYPES.includes(entry.type as SupportedMediaType)) {
    return fail(UPLOAD_ERRORS.unsupportedFileType(entry.type), 400);
  }
  if (entry.size === 0) {
    return fail(UPLOAD_ERRORS.emptyFile, 400);
  }
  if (entry.size > MAX_FILE_BYTES) {
    return fail(UPLOAD_ERRORS.fileTooLarge, 400);
  }
  return { ok: true, file: entry };
}

async function uploadFileToBlob(
  file: File,
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<BlobUpload> {
  try {
    const blob = await put(`invoices/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      contentType: mediaType,
    });
    return { ok: true, blobUrl: blob.url };
  } catch (error) {
    console.error("Blob upload failed", error);
    if (error instanceof BlobServiceRateLimited) {
      return fail(UPLOAD_ERRORS.blobRateLimited, 502);
    }
    if (error instanceof BlobError) {
      return fail(error.message, 502);
    }
    return fail(UPLOAD_ERRORS.blobUploadFailed, 502);
  }
}

async function saveExtractedInvoice({
  file,
  blobUrl,
  extraction,
  rawResponse,
  model,
}: {
  file: File;
  blobUrl: string;
  extraction: InvoiceExtraction;
  rawResponse: unknown;
  model: string;
}) {
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
      { error: UPLOAD_ERRORS.saveFailed, fileUrl: blobUrl },
      { status: 500 },
    );
  }
}

async function handlePost(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to parse multipart form data", error);
    return NextResponse.json({ error: UPLOAD_ERRORS.malformedRequest }, { status: 400 });
  }

  const validated = validateUploadedFile(formData.get("file"));
  if (!validated.ok) return validated.response;
  const { file } = validated;

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type as SupportedMediaType;

  const uploaded = await uploadFileToBlob(file, buffer, mediaType);
  if (!uploaded.ok) return uploaded.response;
  const { blobUrl } = uploaded;

  let extraction, rawResponse, model;
  try {
    ({ extraction, rawResponse, model } = await extractInvoice({
      base64Data: buffer.toString("base64"),
      mediaType,
    }));
  } catch (rawError) {
    console.error("Extraction failed", rawError);
    return mapExtractionErrorToResponse(rawError, blobUrl);
  }

  return saveExtractedInvoice({ file, blobUrl, extraction, rawResponse, model });
}

// ---- GET /api/invoices — filtered list ----

async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = parseInvoiceListParams(searchParams);

  const validationError = validateInvoiceListParams(params);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const conditions = buildInvoiceListConditions(params);

  try {
    const rows = await db
      .select()
      .from(invoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to query invoices", error);
    return NextResponse.json({ error: LIST_ERRORS.loadFailed }, { status: 500 });
  }
}

// ---- Route entry points ----

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("Unexpected error handling invoice upload", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    return await handleGet(request);
  } catch (error) {
    console.error("Unexpected error handling invoice list request", error);
    return NextResponse.json({ error: COMMON_ERRORS.unexpectedServer }, { status: 500 });
  }
}
