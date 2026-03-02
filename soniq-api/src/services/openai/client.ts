// OpenAI Client Setup
// GPT-4o mini for reliable fallback

import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create OpenAI client singleton
export const openaiClient = OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

// Model configuration
// GPT-4.1 mini: Fast, excellent instruction following, 1M token context
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (openaiClient) {
  console.log(`[OPENAI] Initialized with model: ${MODEL_NAME}`);
} else {
  console.error(
    "[OPENAI] NOT INITIALIZED - OPENAI_API_KEY is missing or empty",
  );
}

export const modelName = MODEL_NAME;
