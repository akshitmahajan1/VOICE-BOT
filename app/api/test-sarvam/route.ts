import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sarvamKey = process.env.SARVAM_API_KEY;
    
    if (!sarvamKey) {
      return NextResponse.json({
        error: "SARVAM_API_KEY not set",
      }, { status: 503 });
    }

    // Create a minimal valid webm file (silence)
    const silenceWebM = Buffer.from([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
      0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x75, 0xa2, 0x45, 0xb0, 0x75, 0xa1, 0xff,
    ]);

    const form = new FormData();
    form.append("file", new Blob([silenceWebM], { type: "audio/webm" }), "audio.webm");
    form.append("model", "saaras:v3");
    form.append("mode", "transcribe");

    console.log("Testing with api-subscription-key header...");
    const res1 = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
      },
      body: form,
    });

    const body1 = await res1.text();

    return NextResponse.json({
      test: "api-subscription-key header",
      status: res1.status,
      statusText: res1.statusText,
      body: body1.substring(0, 500),
      contentType: res1.headers.get("content-type"),
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 });
  }
}
