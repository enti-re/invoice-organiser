import { generateObject, type FilePart } from "ai";

import { EXTRACTION_MODEL_ID, extractionModel } from "@/lib/model";
import { invoiceExtractionSchema, type InvoiceExtraction } from "@/lib/invoice-extraction-schema";

export type SupportedMediaType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

// Generous enough for a multi-page PDF read + structured response, short
// enough that a hung request fails fast with a clear error instead of
// leaving the caller (and the user) waiting indefinitely.
const EXTRACTION_TIMEOUT_MS = 60_000;

// Signal 1 of the confidence-scoring layer (see confidence.ts): prompted
// conservatism. The other two signals (deterministic sanity checks, and
// folding `uncertain_fields` into the confidence map) are pure post-hoc
// logic and don't depend on this prompt, but they only work if the model
// is honest here about what it isn't sure of.
const EXTRACTION_INSTRUCTIONS = [
  "Extract the invoice/receipt fields from this document.",
  "Only fill a field if you are genuinely confident in the value — if it's not present or not legible at all, return null rather than guessing.",
  "If a field has 2-3 plausible readings (e.g. an ambiguous date format, a smudged digit), pick your best guess for the value, but add an entry to uncertain_fields naming the field and briefly explaining the ambiguity.",
  "You may also use uncertain_fields to explain a null value when that's informative — e.g. a due date that's genuinely absent from the document, versus one that's present but illegible.",
].join(" ");

export async function extractInvoice(params: {
  base64Data: string;
  mediaType: SupportedMediaType;
}): Promise<{ extraction: InvoiceExtraction; rawResponse: unknown; model: string }> {
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
}
