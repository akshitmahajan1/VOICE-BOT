import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function mapToSarvamLanguage(language: string) {
  if (!language || language === "auto") return "unknown";
  return language;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const language = (formData.get("language") as string) || "auto";

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: "Audio blob missing" }, { status: 400 });
    }

    const sarvamKey = process.env.SARVAM_API_KEY;
    if (sarvamKey) {
      const sarvamBody = new FormData();
      sarvamBody.append("file", audio, "speech.webm");
      sarvamBody.append("model", process.env.SARVAM_STT_MODEL || "saaras:v3");
      sarvamBody.append("mode", "transcribe");
      sarvamBody.append("language_code", mapToSarvamLanguage(language));

      const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamKey,
        },
        body: sarvamBody,
      });

      if (sarvamRes.ok) {
        const sarvamJson = (await sarvamRes.json()) as {
          transcript?: string;
          language_code?: string;
          language_probability?: number;
        };

        return NextResponse.json({
          text: sarvamJson.transcript ?? "",
          language: sarvamJson.language_code ?? language,
          confidence: sarvamJson.language_probability ?? 0.9,
          provider: "sarvam",
        });
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        {
          error: "No STT provider configured",
          details: "Set SARVAM_API_KEY or OPENAI_API_KEY",
        },
        { status: 500 },
      );
    }

    const body = new FormData();
    body.append("file", audio, "speech.webm");
    body.append("model", "whisper-1");
    if (language !== "auto") {
      body.append("language", language);
    }
    body.append("response_format", "verbose_json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body,
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "Whisper request failed", details: txt },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      text: string;
      language?: string;
    };

    return NextResponse.json({
      text: json.text ?? "",
      language: json.language ?? language,
      confidence: 0.95,
      provider: "openai",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Transcription failed", details: String(error) },
      { status: 500 },
    );
  }
}
