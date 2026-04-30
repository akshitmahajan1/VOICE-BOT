# Voice Agent MVP

Production-oriented multilingual real-time voice agent web app using Next.js 14, Vercel AI SDK, and Web Audio API processing.

## Features

- Real-time voice capture with noise suppression
- Sarvam STT with auto language detection
- Gemini API for LLM responses with Google Search grounding
- Web Audio API processing with noise gate
- Session memory with optional Supabase persistence
- Mobile-responsive UI with live transcript and waveform
- PWA manifest + service worker

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY and SARVAM_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Open Agent**.

**Required:**
- `GEMINI_API_KEY`
- `SARVAM_API_KEY`

**Optional:**
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — transcript persistence

## Project Structure

```
app/
  agent/               # Voice agent UI page
  api/
    transcribe/        # Speech to text
    generate/          # LLM response
    tts/               # Text to speech
    chat/              # Full pipeline
components/
  VoiceAgent.tsx       # Main voice runtime
lib/
  ai-client.ts         # Provider orchestration
  memory-manager.ts    # Session history
  knowledge-base.ts    # FAQ lookup
  supabase-server.ts   # Transcript storage
```

## API Endpoints

- `POST /api/transcribe` - Audio to text
- `POST /api/generate` - LLM response
- `POST /api/tts` - Text to audio
- `POST /api/chat` - Full pipeline with memory

## Deploy to Vercel

```bash
git push origin main
```

Import repository into [Vercel](https://vercel.com/new), add env variables from `.env.example`, deploy. Uses edge runtime for low-latency API routes.

## Troubleshooting

**Microphone access denied** — Check browser settings: Settings → Privacy → Microphone. HTTPS required in production.

**No transcription** — Verify `SARVAM_API_KEY`. Check noise gate threshold in settings.

**No LLM response** — Verify `GEMINI_API_KEY`.

**Build errors** — Clear `node_modules` and `package-lock.json`, run `npm install` again.

