import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { NextResponse } from "next/server";

// generateObject wraps the real cause in RetryError.lastError once
// internal retries are exhausted, rather than throwing it directly.
export function mapExtractionErrorToResponse(rawError: unknown, blobUrl: string): NextResponse {
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
