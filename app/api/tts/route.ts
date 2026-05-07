import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const payloadSchema = z.object({
  text: z.string().min(1),
  language: z.string().default("en-US"),
  voiceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = payloadSchema.parse(await req.json());
    return await generateTTS(parsed.text, parsed.language, parsed.voiceId);
  } catch (error) {
    return NextResponse.json({ error: "TTS synthesis failed", details: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const language = searchParams.get("language") || "en-US";
    const voiceId = searchParams.get("voiceId") || undefined;

    if (!text) {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    return await generateTTS(text, language, voiceId);
  } catch (error) {
    return NextResponse.json({ error: "TTS synthesis failed", details: String(error) }, { status: 500 });
  }
}

async function generateTTS(text: string, language: string, voiceId?: string) {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || "EXAVITQu4vr4xnSDxMaL"}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!elevenResponse.ok || !elevenResponse.body) {
      const errText = await elevenResponse.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    return new NextResponse(elevenResponse.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "alloy",
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { provider: "browser-fallback", message: "No TTS provider configured." },
    { status: 200 },
  );
}
