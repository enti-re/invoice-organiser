import { generateObject, type FilePart } from "ai";

import { EXTRACTION_MODEL_ID, extractionModel } from "@/lib/extraction/model";
import { invoiceExtractionSchema, type InvoiceExtraction } from "@/lib/extraction/invoice-extraction-schema";

export type SupportedMediaType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

// Long enough for a multi-page PDF read; short enough to fail fast
// instead of hanging indefinitely.
const EXTRACTION_TIMEOUT_MS = 60_000;

// Signal 1 of confidence.ts's 3-signal system: prompted conservatism.
// The other two signals only work if the model is honest here.
const EXTRACTION_INSTRUCTIONS = [
  "First, decide whether this document actually is an invoice, receipt, or bill. Set is_invoice accordingly, and if it's false, briefly say in not_invoice_reason what the document actually looks like (e.g. a resume, an ID card, a letter).",
  "Then extract the invoice/receipt fields from this document, even if you set is_invoice to false — extract whatever happens to fit the schema on a best-effort basis, so a human reviewer can still see what the model found.",
  "Only fill a field if you are genuinely confident in the value — if it's not present or not legible at all, return null rather than guessing.",
  "If a field has 2-3 plausible readings (e.g. an ambiguous date format, a smudged digit), pick your best guess for the value, but add an entry to uncertain_fields naming the field and briefly explaining the ambiguity.",
  "You may also use uncertain_fields to explain a null value when that's informative — e.g. a due date that's genuinely absent from the document, versus one that's present but illegible.",
].join(" ");

export const extractInvoice = async (params: {
  base64Data: string;
  mediaType: SupportedMediaType;
}): Promise<{ extraction: InvoiceExtraction; rawResponse: unknown; model: string }> => {
  const filePart: FilePart = {
    type: "file",
    data: params.base64Data,
    mediaType: params.mediaType,
  };

  const { object, response } = await generateObject({
    model: extractionModel,
    schema: invoiceExtractionSchema,
    abortSignal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
    messages: [
      {
        role: "user",
        content: [filePart, { type: "text", text: EXTRACTION_INSTRUCTIONS }],
      },
    ],
  });

  return { extraction: object, rawResponse: response, model: EXTRACTION_MODEL_ID };
};
