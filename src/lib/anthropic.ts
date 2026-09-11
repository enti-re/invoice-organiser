import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Pinned via env so a model deprecation doesn't silently change extraction
// behavior — override in .env if Anthropic ships a newer snapshot.
export const EXTRACTION_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
