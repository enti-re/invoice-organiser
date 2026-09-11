import { google } from "@ai-sdk/google";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
}

// "gemini-flash-latest" always points to Google's current recommended Flash
// model, so this doesn't go stale the way a dated snapshot ID would —
// override via env if a specific pinned version is ever needed.
export const EXTRACTION_MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

export const extractionModel = google(EXTRACTION_MODEL_ID);
