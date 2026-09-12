import { google } from "@ai-sdk/google";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
}

// Pinned, not "-latest": `gemini-flash-latest` hit real 503s in testing;
// this version is stable. Override via env if needed.
export const EXTRACTION_MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

export const extractionModel = google(EXTRACTION_MODEL_ID);
