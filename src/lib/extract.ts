import { z } from "zod";

import { anthropic, EXTRACTION_MODEL } from "@/lib/anthropic";
import { invoiceExtractionSchema, type InvoiceExtraction } from "@/lib/invoice-extraction-schema";

const EXTRACTION_TOOL_NAME = "record_invoice_extraction";

// Force structured output via tool-use rather than asking the model to
// "return JSON" in prose — the API guarantees the response matches this
// schema shape instead of us hoping the model formats it correctly.
// zod v4 ships native JSON Schema conversion, so the tool's input_schema
// is generated directly from the same schema we validate the response with
// — one definition, no risk of the two drifting apart.
const extractionTool = {
  name: EXTRACTION_TOOL_NAME,
  description: "Record the extracted fields from a vendor invoice or receipt.",
  input_schema: z.toJSONSchema(invoiceExtractionSchema) as Anthropic.Tool.InputSchema,
};

export type SupportedMediaType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

// Generous enough for a multi-page PDF read + tool-call response, short
// enough that a hung request fails fast with a clear error instead of
// leaving the caller (and the user) waiting indefinitely.
const EXTRACTION_TIMEOUT_MS = 60_000;

// Signal 1 of the confidence-scoring layer (see confidence.ts): prompted
// conservatism. The other two signals (deterministic sanity checks, and
// folding `uncertain_fields` into the confidence map) are pure post-hoc
// logic and don't depend on this prompt, but they only work if the model
// is honest here about what it isn't sure of.
const EXTRACTION_INSTRUCTIONS = [
  "Extract the invoice/receipt fields from this document using the record_invoice_extraction tool.",
  "Only fill a field if you are genuinely confident in the value — if it's not present or not legible at all, return null rather than guessing.",
  "If a field has 2-3 plausible readings (e.g. an ambiguous date format, a smudged digit), pick your best guess for the value, but add an entry to uncertain_fields naming the field and briefly explaining the ambiguity.",
  "You may also use uncertain_fields to explain a null value when that's informative — e.g. a due date that's genuinely absent from the document, versus one that's present but illegible.",
].join(" ");

export async function extractInvoice(params: {
  base64Data: string;
  mediaType: SupportedMediaType;
}): Promise<{ extraction: InvoiceExtraction; rawResponse: unknown; model: string }> {
  const documentBlock: Anthropic.Messages.ContentBlockParam =
    params.mediaType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: params.base64Data },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: params.mediaType, data: params.base64Data },
        };

  const response = await anthropic.messages.create(
    {
      model: EXTRACTION_MODEL,
      max_tokens: 4096,
      tools: [extractionTool],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [documentBlock, { type: "text", text: EXTRACTION_INSTRUCTIONS }],
        },
      ],
    },
    { timeout: EXTRACTION_TIMEOUT_MS },
  );

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUseBlock) {
    throw new Error("Model did not return a tool_use block for invoice extraction");
  }

  const extraction = invoiceExtractionSchema.parse(toolUseBlock.input);

  return { extraction, rawResponse: response, model: EXTRACTION_MODEL };
}

// Re-export the Anthropic namespace type usage above without a wildcard import.
import type Anthropic from "@anthropic-ai/sdk";
