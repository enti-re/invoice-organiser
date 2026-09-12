import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { describe, expect, it } from "vitest";

import { mapExtractionErrorToResponse } from "../extraction-error-response";

const BLOB_URL = "https://example.public.blob.vercel-storage.com/invoices/test.pdf";

const readBody = async (response: Response) => {
  const body = await response.json();
  return { status: response.status, body };
};

describe("mapExtractionErrorToResponse", () => {
  it("maps a timeout error by name to the timeout message", async () => {
    const error = Object.assign(new Error("boom"), { name: "TimeoutError" });
    const { status, body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(status).toBe(502);
    expect(body).toEqual({ error: "Extraction timed out. Please try again.", fileUrl: BLOB_URL });
  });

  it("maps a timeout error by message text to the timeout message", async () => {
    const error = new Error("Request timed out after 30s");
    const { status, body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(status).toBe(502);
    expect(body.error).toBe("Extraction timed out. Please try again.");
  });

  it("maps a 429 APICallError to the rate-limited message", async () => {
    const error = new APICallError({
      message: "Too many requests",
      url: "https://generativelanguage.googleapis.com/v1/models/gemini",
      requestBodyValues: {},
      statusCode: 429,
    });
    const { status, body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(status).toBe(502);
    expect(body.error).toBe("Extraction service is rate limited right now. Please try again shortly.");
  });

  it("maps a 503 APICallError to the overloaded message", async () => {
    const error = new APICallError({
      message: "Service unavailable",
      url: "https://generativelanguage.googleapis.com/v1/models/gemini",
      requestBodyValues: {},
      statusCode: 503,
    });
    const { body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(body.error).toBe("Extraction service is temporarily overloaded. Please try again shortly.");
  });

  it("maps any other APICallError status to the generic unavailable message", async () => {
    const error = new APICallError({
      message: "Internal server error",
      url: "https://generativelanguage.googleapis.com/v1/models/gemini",
      requestBodyValues: {},
      statusCode: 500,
    });
    const { body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(body.error).toBe("Extraction service is unavailable right now. Please try again.");
  });

  it("maps a NoObjectGeneratedError to the no-usable-data message", async () => {
    // response/usage/finishReason are required by the constructor's type but
    // never read by mapExtractionErrorToResponse, so a loose cast is enough here.
    const error = new NoObjectGeneratedError({
      message: "Model did not return an object",
    } as ConstructorParameters<typeof NoObjectGeneratedError>[0]);
    const { body } = await readBody(mapExtractionErrorToResponse(error, BLOB_URL));

    expect(body.error).toBe("Extraction did not return usable data for this document.");
  });

  it("unwraps a RetryError to inspect its lastError", async () => {
    const underlying = new APICallError({
      message: "Too many requests",
      url: "https://generativelanguage.googleapis.com/v1/models/gemini",
      requestBodyValues: {},
      statusCode: 429,
    });
    const retryError = new RetryError({
      message: "Failed after 3 attempts",
      reason: "maxRetriesExceeded",
      errors: [underlying],
    });
    const { body } = await readBody(mapExtractionErrorToResponse(retryError, BLOB_URL));

    expect(body.error).toBe("Extraction service is rate limited right now. Please try again shortly.");
  });

  it("falls back to a generic message for an unrecognized error", async () => {
    const { status, body } = await readBody(mapExtractionErrorToResponse(new Error("mystery"), BLOB_URL));

    expect(status).toBe(502);
    expect(body).toEqual({ error: "Extraction failed", fileUrl: BLOB_URL });
  });

  it("falls back to a generic message for a non-Error thrown value", async () => {
    const { body } = await readBody(mapExtractionErrorToResponse("a raw string", BLOB_URL));

    expect(body.error).toBe("Extraction failed");
  });
});
