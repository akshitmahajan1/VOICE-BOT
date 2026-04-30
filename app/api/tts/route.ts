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

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      const elevenResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${parsed.voiceId || "EXAVITQu4vr4xnSDxMaL"}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: parsed.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.78,
              style: 0.25,
              use_speaker_boost: true,
            },
          }),
        },
      );

      if (!elevenResponse.ok || !elevenResponse.body) {
        const text = await elevenResponse.text();
        return NextResponse.json({ error: text }, { status: 500 });
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
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          input: parsed.text,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }

      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      {
        provider: "browser-fallback",
        message: "No TTS provider configured, using browser speech synthesis.",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "TTS synthesis failed", details: String(error) },
      { status: 500 },
    );
  }
}
