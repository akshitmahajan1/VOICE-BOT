import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTurn, getSessionHistory } from "@/lib/memory-manager";
import { generateAgentResponse } from "@/lib/ai-client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ProviderName } from "@/lib/vercel-ai-setup";

export const runtime = "edge";

const payloadSchema = z.object({
  text: z.string().min(1),
  sessionId: z.string().min(1),
  language: z.string().default("auto"),
  provider: z.enum(["openai", "groq", "anthropic"]).default("openai"),
  model: z.string().optional(),
  enableLogging: z.boolean().default(true),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    language: z.string(),
    timestamp: z.string()
  })).optional()
});

export async function POST(req: NextRequest) {
  try {
    const parsed = payloadSchema.parse(await req.json());
    const history = parsed.history ?? getSessionHistory(parsed.sessionId);

    const response = await generateAgentResponse({
      provider: parsed.provider as ProviderName,
      model: parsed.model,
      userText: parsed.text,
      language: parsed.language,
      history,
    });

    const now = new Date().toISOString();
    const userTurn = {
      role: "user" as const,
      content: parsed.text,
      language: parsed.language,
      timestamp: now,
    };
    const assistantTurn = {
      role: "assistant" as const,
      content: response,
      language: parsed.language,
      timestamp: now,
    };

    addTurn(parsed.sessionId, userTurn);
    addTurn(parsed.sessionId, assistantTurn);

    if (parsed.enableLogging) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("conversation_logs").insert([
          {
            session_id: parsed.sessionId,
            role: userTurn.role,
            text: userTurn.content,
            language: userTurn.language,
            created_at: userTurn.timestamp,
          },
          {
            session_id: parsed.sessionId,
            role: assistantTurn.role,
            text: assistantTurn.content,
            language: assistantTurn.language,
            created_at: assistantTurn.timestamp,
          },
        ]);
      }
    }

    return NextResponse.json({ response, language: parsed.language });
  } catch (error) {
    return NextResponse.json(
      { error: "Chat pipeline failed", details: String(error) },
      { status: 500 },
    );
  }
}
