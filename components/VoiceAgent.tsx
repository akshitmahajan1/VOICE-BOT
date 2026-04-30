"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AudioGraph = {
  ctx: AudioContext;
  analyser: AnalyserNode;
};

type AgentSettings = {
  language: string;
  voiceId: string;
  noiseThreshold: number;
  enableLogging: boolean;
};

type TranscriptEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  language: string;
  confidence: string;
  createdAt: string;
};

type BrowserSpeechRecognitionResult = {
  transcript: string;
  confidence: number;
};

type BrowserSpeechRecognitionResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: BrowserSpeechRecognitionResult;
  };
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const defaultSettings: AgentSettings = {
  language: "auto",
  voiceId: "",
  noiseThreshold: 0.06,
  enableLogging: true,
};

type NoiseGateProps = {
  level: number;
  threshold: number;
};

type SettingsPanelProps = {
  settings: AgentSettings;
  onChange: (next: AgentSettings) => void;
};

type TranscriptionDisplayProps = {
  items: TranscriptEntry[];
  liveText?: string;
};

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return browserWindow.webkitSpeechRecognition ?? browserWindow.SpeechRecognition ?? null;
}

function supportsBrowserSpeechRecognition() {
  return Boolean(getSpeechRecognitionCtor());
}

function resolveRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

async function createAudioProcessingGraph(
  stream: MediaStream,
): Promise<AudioGraph> {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);

  const highPass = ctx.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 120;

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 7600;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.82;

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(analyser);

  return { ctx, analyser };
}

function getRmsLevel(analyser: AnalyserNode): number {
  const buffer = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);

  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

function NoiseGate({ level, threshold }: NoiseGateProps) {
  const active = level > threshold;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>Noise Gate</span>
        <span className={active ? "text-emerald-400" : "text-slate-400"}>
          {active ? "Speech detected" : "Silent"}
        </span>
      </div>
      <div className="h-3 w-full rounded bg-slate-800">
        <div
          className="h-3 rounded bg-sky-400 transition-all"
          style={{ width: `${Math.min(100, Math.round(level * 100))}%` }}
        />
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Settings
      </h2>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Language</span>
        <input
          value={settings.language}
          onChange={(e) => onChange({ ...settings, language: e.target.value })}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="auto"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Voice ID</span>
        <input
          value={settings.voiceId}
          onChange={(e) => onChange({ ...settings, voiceId: e.target.value })}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="ElevenLabs voice ID"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.enableLogging}
          onChange={(e) =>
            onChange({ ...settings, enableLogging: e.target.checked })
          }
        />
        Enable transcript logging
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Noise sensitivity</span>
        <input
          type="range"
          min={0.01}
          max={0.25}
          step={0.01}
          value={settings.noiseThreshold}
          onChange={(e) =>
            onChange({ ...settings, noiseThreshold: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>
    </section>
  );
}

function TranscriptionDisplay({ items, liveText }: TranscriptionDisplayProps) {
  return (
    <div className="h-[400px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Live Transcript
      </h2>
      <div className="space-y-3">
        {liveText ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-sm text-emerald-100">
            <div className="mb-1 text-xs uppercase tracking-wide text-emerald-300">
              Listening...
            </div>
            <p>{liveText}</p>
          </div>
        ) : null}
        {items.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
          >
            <div className="mb-1 text-xs text-slate-400">
              {entry.role.toUpperCase()} • {entry.language} • conf {entry.confidence}
            </div>
            <p className="text-sm text-slate-200">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VoiceAgent() {
  const [settings, setSettings] = useState<AgentSettings>(defaultSettings);
  const [items, setItems] = useState<TranscriptEntry[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const intervalRef = useRef<number | null>(null);
  const levelRef = useRef<number>(0);
  const processingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const speechPauseTimerRef = useRef<number | null>(null);
  const pendingSpeechTranscriptRef = useRef<string>("");
  const recorderFallbackStartedRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const assistantSpeechResolveRef = useRef<(() => void) | null>(null);
  const bargeInHitsRef = useRef(0);

  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    return () => {
      stopListening().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSpeechPauseTimer() {
    if (speechPauseTimerRef.current) {
      window.clearTimeout(speechPauseTimerRef.current);
      speechPauseTimerRef.current = null;
    }
  }

  function resolveAssistantSpeech() {
    const resolve = assistantSpeechResolveRef.current;
    assistantSpeechResolveRef.current = null;
    if (resolve) {
      resolve();
    }
  }

  function stopAssistantSpeech() {
    speechSynthesis.cancel();

    const activeAudio = activeAudioRef.current;
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = "";
      activeAudio.load();
      activeAudioRef.current = null;
    }

    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }

    resolveAssistantSpeech();
  }

  async function processTranscript(text: string, language: string, confidence: number) {
    if (!text.trim()) return;
    setLiveTranscript("");

    const userEntry: TranscriptEntry = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      language,
      confidence: confidence.toFixed(2),
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, userEntry]);

    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sessionId,
        language,
        enableLogging: settings.enableLogging,
      }),
    });

    if (!chatRes.ok) return;
    const chatJson = (await chatRes.json()) as {
      response: string;
      language: string;
    };

    const assistantEntry: TranscriptEntry = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: chatJson.response,
      language: chatJson.language,
      confidence: "1.00",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, assistantEntry]);
    await speak(chatJson.response, chatJson.language);
  }

  async function finalizeSpeechTranscript(transcript: string, language: string) {
    const cleaned = transcript.trim();
    if (!cleaned) return;
    pendingSpeechTranscriptRef.current = "";
    setLiveTranscript("");
    clearSpeechPauseTimer();
    await processTranscript(cleaned, language, 0.75);
  }

  function startBrowserSpeechFallback() {
    const SpeechRecognitionImpl = getSpeechRecognitionCtor();

    if (!SpeechRecognitionImpl) {
      setError("Your browser does not support live browser transcription.");
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language === "auto" ? "en-US" : settings.language;

    recognition.onresult = async (event) => {
      if (isSpeakingRef.current) return;
      let interimTranscript = "";
      let finalTranscript = pendingSpeechTranscriptRef.current;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      pendingSpeechTranscriptRef.current = finalTranscript;
      setLiveTranscript([finalTranscript, interimTranscript.trim()].filter(Boolean).join(" ").trim());

      if (finalTranscript) {
        clearSpeechPauseTimer();
        speechPauseTimerRef.current = window.setTimeout(() => {
          void finalizeSpeechTranscript(finalTranscript, recognition.lang);
        }, 1100);
      }
    };

    recognition.onerror = () => {
      // Silent fallback: MediaRecorder-based STT may still be active.
    };

    recognition.onend = () => {
      if (isListening && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch {
          // No-op; fallback stays best-effort.
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // No-op
    }
  }

  async function processAudioChunk(blob: Blob) {
    if (processingRef.current) return;
    if (isSpeakingRef.current) return;
    if (pendingSpeechTranscriptRef.current) return;

    processingRef.current = true;

    try {
      const body = new FormData();
      body.append("audio", blob, "chunk.webm");
      body.append("language", settings.language);
      body.append("sessionId", sessionId);

      const sttRes = await fetch("/api/transcribe", {
        method: "POST",
        body,
      });

      if (!sttRes.ok) {
        const errText = await sttRes.text();
        console.error("Transcription error:", errText);
        setError(
          errText.includes("No STT provider configured")
            ? "No STT provider configured. Add OPENAI_API_KEY or SARVAM_API_KEY in Vercel."
            : "Transcription failed. Check the API response in the browser console.",
        );
        return;
      }
      const sttJson = (await sttRes.json()) as {
        text: string;
        language: string;
        confidence: number;
      };

      if (!sttJson.text?.trim()) return;

      setError(null);

      await processTranscript(sttJson.text, sttJson.language, sttJson.confidence);
    } catch (err) {
      console.error("Audio chunk processing failed:", err);
    } finally {
      processingRef.current = false;
    }
  }

  function startRecorderFallback(stream: MediaStream) {
    if (recorderFallbackStartedRef.current) return;
    recorderFallbackStartedRef.current = true;

    const mimeType = resolveRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      if (isSpeakingRef.current) return;
      await processAudioChunk(event.data);
    };

    recorder.onerror = () => {
      setError("Audio recorder failed.");
    };

    recorder.start(5000);
  }

  async function startListening() {
    try {
      setError(null);
      clearSpeechPauseTimer();
      pendingSpeechTranscriptRef.current = "";
      setLiveTranscript("");
      recorderFallbackStartedRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      streamRef.current = stream;
      graphRef.current = await createAudioProcessingGraph(stream);
      startRecorderFallback(stream);
      intervalRef.current = window.setInterval(() => {
        if (!graphRef.current) return;
        const next = getRmsLevel(graphRef.current.analyser);
        levelRef.current = next;
        setLevel(next);

        if (isSpeakingRef.current) {
          const bargeInThreshold = Math.max(settings.noiseThreshold * 3, 0.12);
          if (next >= bargeInThreshold) {
            bargeInHitsRef.current += 1;
            if (bargeInHitsRef.current >= 3) {
              bargeInHitsRef.current = 0;
              stopAssistantSpeech();
            }
          } else {
            bargeInHitsRef.current = 0;
          }
        } else {
          bargeInHitsRef.current = 0;
        }
      }, 120);
      setIsListening(true);

      if (supportsBrowserSpeechRecognition()) {
        startBrowserSpeechFallback();
      }
    } catch {
      setError("Microphone access failed. Check browser permissions.");
    }
  }

  async function stopListening() {
    setIsListening(false);
    clearSpeechPauseTimer();
    stopAssistantSpeech();
    pendingSpeechTranscriptRef.current = "";
    recorderFallbackStartedRef.current = false;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    recognitionRef.current?.stop();
    graphRef.current?.ctx.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    recognitionRef.current = null;
    graphRef.current = null;
    streamRef.current = null;
  }

  async function speak(text: string, language: string) {
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    clearSpeechPauseTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    bargeInHitsRef.current = 0;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language,
          voiceId: settings.voiceId,
        }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          activeAudioRef.current = audio;
          activeAudioUrlRef.current = url;
          assistantSpeechResolveRef.current = () => {
            if (activeAudioUrlRef.current === url) {
              URL.revokeObjectURL(url);
              activeAudioUrlRef.current = null;
            }
            activeAudioRef.current = null;
            resolve();
          };
          audio.onended = () => resolveAssistantSpeech();
          audio.onerror = () => resolveAssistantSpeech();
          void audio.play().catch(() => resolveAssistantSpeech());
        });
      } else {
        const fallback = new SpeechSynthesisUtterance(text);
        fallback.lang = language === "auto" ? "en-US" : language;
        await new Promise<void>((resolve) => {
          assistantSpeechResolveRef.current = resolve;
          fallback.onend = () => resolve();
          fallback.onerror = () => resolve();
          speechSynthesis.speak(fallback);
        });
      }
    } finally {
      resolveAssistantSpeech();
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (isListening) {
        pendingSpeechTranscriptRef.current = "";
        setLiveTranscript("");
        if (supportsBrowserSpeechRecognition()) {
          startBrowserSpeechFallback();
        }
      }
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 backdrop-blur">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Live Voice Agent</h1>
            <p className="text-sm text-slate-300">
              Continuous listening with VAD, multilingual STT, LLM reasoning, and
              human-like TTS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (isListening ? stopListening() : startListening())}
            className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400"
          >
            {isListening ? "Stop" : "Start"} Listening
          </button>
        </header>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <NoiseGate level={level} threshold={settings.noiseThreshold} />
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400">Agent state</div>
            <div className="mt-2 text-lg font-medium">
              {isSpeaking ? "Speaking" : isListening ? "Listening" : "Idle"}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <TranscriptionDisplay items={items} liveText={liveTranscript} />
      </section>

      <SettingsPanel settings={settings} onChange={setSettings} />
    </div>
  );
}
