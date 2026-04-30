import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";

export type ProviderName = "openai" | "groq" | "anthropic";

export function getProviderModel(provider: ProviderName, model?: string) {
  if (provider === "groq") {
    return groq(model ?? "llama-3.3-70b-versatile");
  }
  if (provider === "anthropic") {
    return anthropic(model ?? "claude-3-5-sonnet-latest");
  }
  return openai(model ?? "gpt-4o-mini");
}
