import { google } from "@ai-sdk/google";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
}

// Pinned to a specific version rather than the "-latest" alias: in testing,
// `gemini-flash-latest` returned real 503 "high demand" errors while this
// pinned version worked reliably. Override via env if needed.
export const EXTRACTION_MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

export const extractionModel = google(EXTRACTION_MODEL_ID);
