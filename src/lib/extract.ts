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

  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    tools: [extractionTool],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          documentBlock,
          {
            type: "text",
            text: "Extract the invoice/receipt fields from this document using the record_invoice_extraction tool. If a field is not present or not legible, use null rather than guessing.",
          },
        ],
      },
    ],
  });

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
