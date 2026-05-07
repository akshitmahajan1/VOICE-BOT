# Multilingual Voice Agent

A production-ready, highly responsive multilingual real-time voice agent web application built with Next.js 14, Vercel AI SDK, and the Web Audio API. 

This is a **full-stack voice AI system** featuring a premium Glassmorphism UI, real-time audio visualization with the Orb, intelligent noise gating, multi-provider LLM support with grounded search, and graceful fallback mechanisms across all critical components.

## ✨ Key Features

- **Premium Glassmorphism UI**: Beautiful, dynamic interface with frosted glass effects, smooth gradients, and micro-animations.
- **Continuous Voice Capture**: Advanced Web Audio API integration with a custom noise gate and state-lock mechanism to prevent the agent from listening to its own voice.
- **Real-time Audio Visualization**: Animated Orb Visualizer displaying live waveform and audio levels during voice capture and playback.
- **Flawless Context Memory**: Frontend-persisted conversation history with intelligent Edge API integration, ensuring perfect memory across sessions.
- **Multilingual STT**: Sarvam AI (saaras:v3) for high-quality transcription, with live browser fallback via Web Speech API.
- **Smart Text-To-Speech (TTS)**: Seamless integration with ElevenLabs and OpenAI TTS models with intelligent audio sanitization. If an API key is missing or invalid, it gracefully falls back to the browser's native speech synthesis (with built-in safety timeouts to prevent Chrome hanging bugs).
- **Advanced LLM Reasoning**: Google Gemini 2.5 Flash with search-grounded answers for real-time facts (prices, weather, news, dates, etc). Supports fallback to OpenAI, Groq, and Anthropic providers.
- **Optional Logging**: Supabase integration for persisting conversation logs to a database.

## 🎯 What You've Built

This project demonstrates:
- **Resilient Voice Pipeline**: Every critical component (STT, TTS, LLM) has intelligent fallback chains ensuring the app never fails completely
- **Premium UI/UX**: Glassmorphism design with the Orb Visualizer creates an engaging, modern interface
- **Multi-Provider Architecture**: Orchestrate between Gemini, OpenAI, Groq, and Anthropic with zero-config switching
- **Production-Ready**: Edge runtime, rate limiting, database persistence, error handling, and graceful degradation
- **Audio Intelligence**: Noise gating prevents self-listening, audio sanitization cleans LLM output for speech, and real-time visualization keeps users engaged

## 🔄 How the Voice Pipeline Works

1. **User speaks** → Web Audio API captures audio chunks
2. **Noise gate analyzes** → If sound level exceeds threshold, recording starts
3. **Speech-to-Text** → Sends chunk to Sarvam AI (fallback: browser Web Speech API)
4. **Memory lookup** → Appends transcript to frontend-persisted conversation history
5. **LLM reasoning** → Sends to Gemini (with grounded search) or fallback provider
6. **Audio sanitization** → Cleans response (removes citations, markdown, etc.)
7. **Text-to-Speech** → Streams via ElevenLabs or OpenAI (fallback: browser speech synthesis)
8. **Orb animates** → Visualizer responds to audio playback in real-time
9. **Log created** → Optionally persists to Supabase for analytics

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local
```

### Environment Variables
To get the most out of the application, populate the following keys in your `.env.local`:

**Recommended for Best Experience:**
- `GEMINI_API_KEY` — Google Gemini 2.5 Flash for intelligent reasoning and grounded search
- `ELEVENLABS_API_KEY` — Premium, human-like voices for TTS (Recommended)
- `SARVAM_API_KEY` — High-quality multilingual Speech-to-Text (saaras:v3 model)

**Alternative LLM Providers (Optional):**
- `OPENAI_API_KEY` — Alternative for both TTS and LLM
- `ANTHROPIC_API_KEY` — Claude for LLM reasoning
- `GROQ_API_KEY` — Fast inference alternative

**Optional Features:**
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` — For persisting conversation logs to a database
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` — For distributed rate limiting
- `VERCEL_POSTGRES_URL` — PostgreSQL integration (if using Vercel)

**Note:** If TTS keys are missing, the app will fall back to your browser's built-in speech synthesis. If STT fails, it will use the browser's Web Speech API.

### Run the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and click **Open Agent**.

## 🏗️ Architecture Highlights

### Frontend-Persisted Memory
Traditional chatbots store history on the server, creating latency. This project keeps conversation memory on the frontend and passes it securely to the API. Result: **instant memory access and perfect context preservation**.

### Multi-Provider Orchestration
Instead of locking into one LLM provider:
- **Primary**: Gemini 2.5 Flash with grounded search
- **Fallbacks**: OpenAI, Anthropic (Claude), Groq
- **Zero config**: Switch providers via API request or environment variables

### Intelligent Fallback Chains
- **STT fails?** → Browser Web Speech API kicks in
- **TTS key missing?** → Browser native speech synthesis
- **LLM provider down?** → Try next provider
- Every layer has a safety net, ensuring the app works even with partial configuration

### Audio Intelligence
- **Noise Gate**: Prevents the agent from listening to its own voice (state-lock mechanism)
- **Audio Sanitization**: Strips citations, markdown, and non-speech content before TTS
- **Real-time Visualization**: Orb Visualizer responds to live audio, creating engagement

## 📁 Project Structure

```
app/
  agent/                # Voice agent main UI page with real-time voice pipeline
  about/                # About Us page
  dashboard/            # Admin dashboard (optional)
  knowledge-base/       # Knowledge base management
  api/
    transcribe/         # Sarvam STT with Web Speech fallback
    chat/               # Multi-provider LLM pipeline with grounded search
    tts/                # ElevenLabs/OpenAI TTS with browser fallback
    generate/           # Generative content endpoint
    test-sarvam/        # Sarvam API testing utility
components/
  VoiceAgent.tsx        # Core React component for voice capture, noise gating, TTS
  OrbVisualizer.tsx     # Real-time audio waveform visualization
  PwaRegister.tsx       # PWA registration for offline support
lib/
  ai-client.ts          # Multi-provider LLM orchestration (Gemini, OpenAI, Anthropic, Groq)
  vercel-ai-setup.ts    # Vercel AI SDK initialization
  memory-manager.ts     # Stateful conversation memory (frontend-persisted)
  knowledge-base.ts     # Static FAQ / knowledge lookup
  supabase-server.ts    # Server-side Supabase client
public/
  sw.js                 # Service Worker for PWA offline functionality
```

## 🚀 Production-Ready Features

- **Edge Runtime**: All API routes run on Vercel Edge for sub-100ms latency
- **Rate Limiting**: Upstash Redis integration for distributed rate limiting
- **Conversation Logging**: Optional Supabase integration for analytics and debugging
- **Error Handling**: Graceful error responses with clear fallback paths
- **Type Safety**: Full TypeScript with Zod validation for API payloads
- **PWA Support**: Service Worker enables offline-first functionality
- **Performance**: Streamed TTS responses, optimized audio chunk sizes, lazy-loaded components

## 🧪 Testing & Development

- **Test Gemini API**: Run `node test_gemini.mjs` to verify Gemini API connectivity and key validity.
- **Sarvam STT Testing**: Use the `/api/test-sarvam` endpoint to test transcription.

## 🛠 Troubleshooting

- **Microphone Access Denied**: Check your browser settings (Settings → Privacy → Microphone). Ensure you are running on `localhost` or `HTTPS` in production.
- **Transcription Failed (503)**: `SARVAM_API_KEY` is missing. Add it to `.env.local` or configure in Vercel deployment.
- **Transcription Failed (502)**: Sarvam API upstream error. Check audio format and API subscription limits.
- **Agent gets stuck "Speaking..."**: This indicates the browser's native TTS hung. A safety timeout is built in, but for best results, provide a valid `ELEVENLABS_API_KEY` or `OPENAI_API_KEY` in `.env.local`.
- **Agent cuts itself off during speech**: The noise gate threshold might be too low. Adjust the "Noise sensitivity" slider in the agent settings. Try values between 0.03–0.10.
- **LLM not responding (Gemini)**: Verify `GEMINI_API_KEY` is correct in `.env.local`. Test with `node test_gemini.mjs`.
- **Port already in use**: If `npm run dev` fails due to port 3000, it will automatically try port 3001. Check your terminal output for the correct URL.
- **Logging to Supabase fails silently**: If `SUPABASE_URL` and `SUPABASE_ANON_KEY` are invalid, logs are skipped gracefully. Verify credentials in `.env.local`.
