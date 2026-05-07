import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
    console.log("SARVAM_API_KEY defined:", !!sarvamKey);

    if (!sarvamKey) {
      return NextResponse.json(
        {
          error: "No STT provider configured",
          details: "Set SARVAM_API_KEY in .env.local for local development or in Vercel for deployment.",
        },
        { status: 503 },
      );
    }

    // Log audio info for debugging
    console.log("Audio type:", (audio as Blob).type, "Size:", (audio as Blob).size, "bytes");

    const extension = (audio as Blob).type.includes("wav") ? "wav" : "webm";
    const sarvamBody = new FormData();
    sarvamBody.append("file", audio, `speech.${extension}`);
    sarvamBody.append("model", process.env.SARVAM_STT_MODEL || "saaras:v3");
    sarvamBody.append("mode", "transcribe");
    if (language !== "auto") {
      sarvamBody.append("language_code", mapToSarvamLanguage(language));
    }

    console.log("Calling Sarvam API...");
    const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
      },
      body: sarvamBody,
    });

    console.log("Sarvam response status:", sarvamRes.status, sarvamRes.ok);

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

    const errText = await sarvamRes.text();
    console.log("Sarvam error:", sarvamRes.status, errText?.substring(0, 500));
    console.log("Sarvam response headers:", Object.fromEntries(sarvamRes.headers.entries()));

    return NextResponse.json(
      {
        error: "Sarvam transcription failed",
        status: sarvamRes.status,
        details: errText?.slice(0, 1000) || `Sarvam returned HTTP ${sarvamRes.status}`,
        headers: Object.fromEntries(sarvamRes.headers.entries()),
      },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Transcription failed", details: String(error) },
      { status: 500 },
    );
  }
}
