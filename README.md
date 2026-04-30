# Voice Agent MVP

Production-oriented multilingual real-time voice agent web app using Next.js 14, Vercel AI SDK, edge-friendly API routes, and Web Audio API processing.

**Live Demo:** http://localhost:3000/agent

## Features

- Continuous microphone capture with browser-level echo cancellation/noise suppression
- Web Audio processing chain (high-pass, low-pass, compressor) + VAD-style RMS gate
- Whisper STT via OpenAI API with language auto mode
- Configurable LLM backend via Vercel AI SDK providers (OpenAI/Groq/Anthropic)
- Gemini API with Google Search grounding for live facts, dates, and prices
- ElevenLabs TTS primary, OpenAI TTS fallback, Web Speech API browser fallback
- Session memory in process + optional persistent transcript logging in Supabase
- Toggleable transcription logging
- Mobile-responsive interface with waveform/noise gate status and live transcript pane
- PWA manifest + service worker bootstrap

## Quick Start

1. **Install and configure**

```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY at minimum
```

2. **Launch dev server**

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and click **Open Agent**.

3. **Test the voice pipeline**

- Click **Start Listening**
- Speak naturally into your microphone
- Watch real-time transcription, noise gate, and TTS playback
- Toggle settings: language, voice ID, transcription logging

## Setup (Detailed)

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

Required:
- `OPENAI_API_KEY` — Whisper STT and fallback TTS

Optional:
- `GEMINI_API_KEY` — Live answers with Google Search grounding
- `ELEVENLABS_API_KEY` — Premium multilingual voices
- `GROQ_API_KEY` / `ANTHROPIC_API_KEY` — Alternate LLM providers
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — Transcript persistence
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Rate limiting

3. Run development server

```bash
npm run dev
```

4. Build and lint

```bash
npm run lint
npm run build
```

## API Endpoints

- `POST /api/transcribe` - Speech to text pipeline
- `POST /api/generate` - LLM response generation
- `POST /api/tts` - Text to speech synthesis
- `POST /api/chat` - Full user-turn pipeline + memory + optional logging

## Architecture

### Frontend (`/app` + `/components`)
- **VoiceAgent.tsx** – Main UI + voice runtime controller (mic, STT, chat, TTS, barge-in)
- Noise gate, transcript display, and settings UI are intentionally colocated inside `VoiceAgent.tsx`
- Audio processing helpers are intentionally colocated inside `VoiceAgent.tsx`

### Backend (`/api`)
- **POST /api/transcribe** – Stream audio → Whisper → text
- **POST /api/generate** – User text → LLM → response (memory-aware)
- **POST /api/tts** – Response text → ElevenLabs/OpenAI → audio stream
- **POST /api/chat** – Full pipeline: transcribe → generate → speak + log

### Libraries
- **memory-manager.ts** – Session conversation history (in-process)
- **ai-client.ts** – Provider orchestration + Gemini grounding + fallback prompt logic
- **knowledge-base.ts** – FAQ data + lookup and grouping utilities
- **supabase-server.ts** – Optional transcript persistence
- **vercel-ai-setup.ts** – Provider configuration

## Workflow Map

1. User speaks in browser on `/agent`.
2. `VoiceAgent.tsx` captures mic chunks and sends them to `/api/transcribe`.
3. Transcript text is posted to `/api/chat`.
4. `/api/chat` reads session memory, gets LLM output via `ai-client`, stores turns, optionally logs to Supabase.
5. Browser requests `/api/tts` for assistant reply and plays audio.
6. Barge-in logic interrupts playback when user speech is detected above threshold.

## Debugging

VS Code debug configs available:
- **F5** → Next.js: Debug (opens http://localhost:3000 on ready)
- **Ctrl+F5** → Next.js: Build
- **Ctrl+Shift+F5** → Next.js: Lint

Or manually:
```bash
npm run dev    # Development with hot reload
npm run build  # Production build
npm run start  # Run production server
npm run lint   # Type check and ESLint
```

## Deploy to Vercel

1. Push code to GitHub
2. Import repository into [Vercel](https://vercel.com/new)
3. Add environment variables from `.env.example`
4. Deploy

The project includes `vercel.json` configured for:
- Edge runtime API routes (low-latency, globally distributed)
- `no-store` cache headers (real-time audio data)
- Optimized Next.js 14 configuration

## Troubleshooting

**"Microphone access failed"**
- Check browser permissions: Settings → Privacy → Microphone
- HTTPS required in production (localhost works in dev)

**"Transcription empty" or no STT response**
- Verify `OPENAI_API_KEY` is set
- Check noise gate threshold in settings
- Ensure microphone is unmuted and has input

**"It answers with the wrong fact or outdated info"**
- Add `GEMINI_API_KEY` for live answers with Google Search grounding
- The assistant will use Gemini first for time-sensitive questions like prices, news, dates, and rates

**"It cuts me off too quickly or keeps talking over me"**
- The assistant now supports barge-in interruption and should stop speaking when you start talking again

**"No TTS output"**
- If ElevenLabs enabled: verify `ELEVENLABS_API_KEY`
- Falls back to OpenAI TTS or Web Speech API automatically

**Build errors with private package names**
- Clear `node_modules` and `package-lock.json`
- Run `npm install` again

## Contributing

To extend the voice agent:

1. **Add a new LLM provider** → Update `lib/vercel-ai-setup.ts`
2. **Add voice emotion** → Integrate sentiment into `/api/generate` system prompt
3. **Enable knowledge base** → Add RAG vector store to memory manager
4. **Add phone support** → Create `/api/twilio` handler
5. **Customize system prompt** → Edit `DEFAULT_SYSTEM_PROMPT` in `lib/ai-client.ts`
