# 🎙️ Multilingual Voice Agent

A production-ready, highly responsive multilingual voice AI system built with **Next.js 14**, **Vercel AI SDK**, and the **Web Audio API**. This system features a premium Glassmorphism UI, real-time audio visualization, and a resilient multi-provider fallback architecture.

## ✨ Key Features

- **Toggle-Based Recording**: Manual "Start Listening / Send" toggle for precise voice capture and noise-free processing.
- **Real-time Orb Visualization**: Dynamic SVG-based Orb Visualizer that animates and changes colors based on the agent's state.
- **Multilingual STT & TTS**: High-quality transcription via **Sarvam AI** (saaras:v3) and premium speech synthesis via **ElevenLabs** or **OpenAI**.
- **Search-Grounded Reasoning**: **Google Gemini 2.5 Flash** with grounded search for real-time facts and highly accurate reasoning.
- **Resilient Fallback Chains**: Automatic fallback to browser Web Speech API (STT) and native Speech Synthesis (TTS) if API keys are missing or services are unreachable.
- **Glassmorphism Design**: Modern, premium interface with frosted glass effects, smooth gradients, and interactive micro-animations.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   cp .env.example .env.local
   ```
2. **Configure Environment Variables**:
   Populate the following keys in your `.env.local` for the best experience:
   - `GEMINI_API_KEY`: Primary LLM for reasoning and search grounding.
   - `SARVAM_API_KEY`: High-quality multilingual STT.
   - `ELEVENLABS_API_KEY`: Premium, human-like voices for TTS.
3. **Launch the Application**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000/agent` to start interacting.

## 🏗️ Architecture Highlights

- **Multi-Provider Orchestration**: Seamlessly switch between Gemini, OpenAI, Anthropic, and Groq with zero-config overhead.
- **Intelligent Fallbacks**: Every critical layer (STT, LLM, TTS) has a safety net, ensuring the application remains functional even under partial configuration.
- **Frontend-Persisted Memory**: Conversation history is managed on the client, ensuring instant memory access and perfect context preservation across API calls.

## 🎙️ State Management

The agent operates in four distinct states, synchronized with the Orb Visualizer for real-time feedback:

| State | Orb Color | Behavior |
|-------|-----------|----------|
| **IDLE** | ⚪ Gray | Waiting for user interaction |
| **LISTENING_ACTIVE** | 🔵 Blue | Actively capturing microphone input |
| **THINKING** | 💠 Cyan | Processing audio through STT/LLM pipeline |
| **SPEAKING** | 🟣 Purple | Playing response via TTS |

**State Flow:** `IDLE` → `LISTENING` (Click Start) → `THINKING` (Click Send) → `SPEAKING` (Response Ready) → `IDLE` (Finish).

## 📁 Project Structure

- `app/agent`: Main Voice Agent UI and state machine integration.
- `app/api`: Transcribe (STT), Chat (LLM), and TTS API endpoints.
- `components/VoiceAgent.tsx`: Core component managing the voice capture and processing pipeline.
- `components/OrbVisualizer.tsx`: Real-time state-based visualization component.
- `lib/ai-client.ts`: Multi-provider orchestration logic.

## 🛠 Troubleshooting

- **Microphone Access**: Ensure you are using `localhost` or `HTTPS`. Check browser permissions if input is not detected.
- **API Failures (502/503)**: Verify your API keys in `.env.local` and check provider subscription limits.
- **Speech Cutting Off**: If using browser TTS fallback, ensure you're on a stable network connection to prevent synthesis hangs.
