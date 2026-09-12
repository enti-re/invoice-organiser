import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { NextResponse } from "next/server";

const EXTRACTION_ERRORS = {
  timedOut: "Extraction timed out. Please try again.",
  rateLimited: "Extraction service is rate limited right now. Please try again shortly.",
  overloaded: "Extraction service is temporarily overloaded. Please try again shortly.",
  unavailable: "Extraction service is unavailable right now. Please try again.",
  noObjectGenerated: "Extraction did not return usable data for this document.",
  generic: "Extraction failed",
} as const;

const extractionErrorResponse = (message: string, blobUrl: string): NextResponse => {
  return NextResponse.json({ error: message, fileUrl: blobUrl }, { status: 502 });
};

// generateObject wraps the real cause in RetryError.lastError once
// internal retries are exhausted, rather than throwing it directly.
export const mapExtractionErrorToResponse = (rawError: unknown, blobUrl: string): NextResponse => {
  const error = RetryError.isInstance(rawError) ? rawError.lastError : rawError;

  if (
    (error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof Error && /timeout|timed out/i.test(error.message))
  ) {
    return extractionErrorResponse(EXTRACTION_ERRORS.timedOut, blobUrl);
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return extractionErrorResponse(EXTRACTION_ERRORS.rateLimited, blobUrl);
    }
    if (error.statusCode === 503) {
      return extractionErrorResponse(EXTRACTION_ERRORS.overloaded, blobUrl);
    }
    return extractionErrorResponse(EXTRACTION_ERRORS.unavailable, blobUrl);
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return extractionErrorResponse(EXTRACTION_ERRORS.noObjectGenerated, blobUrl);
  }

  return extractionErrorResponse(EXTRACTION_ERRORS.generic, blobUrl);
};
