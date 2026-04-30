import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAgentResponse } from "@/lib/ai-client";
import { addTurn, getSessionHistory } from "@/lib/memory-manager";
import type { ProviderName } from "@/lib/vercel-ai-setup";

export const runtime = "edge";

const payloadSchema = z.object({
  text: z.string().min(1),
  sessionId: z.string().min(1),
  language: z.string().default("auto"),
  provider: z.enum(["openai", "groq", "anthropic"]).default("openai"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = payloadSchema.parse(await req.json());
    const history = getSessionHistory(parsed.sessionId);

    const response = await generateAgentResponse({
      provider: parsed.provider as ProviderName,
      model: parsed.model,
      userText: parsed.text,
      language: parsed.language,
      history,
    });

    const now = new Date().toISOString();
    addTurn(parsed.sessionId, {
      role: "user",
      content: parsed.text,
      language: parsed.language,
      timestamp: now,
    });
    addTurn(parsed.sessionId, {
      role: "assistant",
      content: response,
      language: parsed.language,
      timestamp: now,
    });

    return NextResponse.json({ response, language: parsed.language });
  } catch (error) {
    return NextResponse.json(
      { error: "Generation failed", details: String(error) },
      { status: 500 },
    );
  }
}
