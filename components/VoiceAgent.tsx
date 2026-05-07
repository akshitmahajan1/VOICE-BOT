"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OrbVisualizer, type AgentState } from "./OrbVisualizer";

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

function sanitizeForTTS(text: string) {
  if (!text) return text;
  let t = text;
  // Remove citation blocks like [cite: ...] and similar bracketed footnotes
  t = t.replace(/\[cite:[^\]]*\]/gi, "");
  t = t.replace(/\[\s*cite\s*:\s*[^\]]*\]/gi, "");
  // Remove any remaining bracketed references [text]
  t = t.replace(/\[[^\]]*\]/g, "");
  // Turn list markers and leading asterisks into sentence breaks
  t = t.replace(/(^|\n)\s*[-\*]\s+/g, ". ");
  // Remove leftover standalone words like 'cite' or 'cite:'
  t = t.replace(/\bcite\b:?/gi, "");
  // Remove common markdown punctuation characters that shouldn't be spoken
  t = t.replace(/[`_~>#\{\}]/g, "");
  // Convert written punctuation words to actual punctuation
  t = t.replace(/\bcomma\b/gi, ",");
  t = t.replace(/\bdot\b/gi, ".");
  t = t.replace(/\bperiod\b/gi, ".");
  t = t.replace(/\bsemicolon\b/gi, ";");
  // Remove the word 'asterisk' and similar artifacts
  t = t.replace(/\basterisk\b/gi, "");
  // Collapse repeated punctuation and whitespace
  t = t.replace(/\s+/g, " ");
  t = t.replace(/\.{2,}/g, ".");
  t = t.replace(/,{2,}/g, ",");
  return t.trim();
}

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

function encodePcm16ToWav(audioBuffer: AudioBuffer) {
  const numberOfChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const dataLength = channelData.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let index = 0; index < channelData.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, channelData[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function convertBlobToWav(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return encodePcm16ToWav(audioBuffer);
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

function NoiseGate({ level, threshold }: NoiseGateProps) {
  const active = level > threshold;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.15)]">
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
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.15)]">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Settings
      </h2>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Language</span>
        <input
          value={settings.language}
          onChange={(e) => onChange({ ...settings, language: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md text-white placeholder-slate-400 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
          placeholder="auto"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Voice ID</span>
        <input
          value={settings.voiceId}
          onChange={(e) => onChange({ ...settings, voiceId: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md text-white placeholder-slate-400 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, [items, liveText]);

  return (
    <div ref={containerRef} className="h-[400px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] custom-scrollbar">
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
            className="rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-md"
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
  const [isRecording, setIsRecording] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("IDLE");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
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

  const handleEndOfSpeech = () => {
    setAgentState("IDLE");
    isSpeakingRef.current = false;

    // Resume audio context if suspended (echo cancellation)
    if (graphRef.current?.ctx.state === "suspended") {
      graphRef.current.ctx.resume().catch(() => undefined);
    }
  };

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
        history: items.map(i => ({ role: i.role, content: i.text, language: i.language, timestamp: i.createdAt })),
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
    const ttsText = sanitizeForTTS(chatJson.response);
    await speak(ttsText, chatJson.language);
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
        }, 1800);
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
      const wavBlob = blob.type === "audio/wav" ? blob : await convertBlobToWav(blob);
      const body = new FormData();
      body.append("audio", wavBlob, "chunk.wav");
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
            ? "No STT provider configured. Add SARVAM_API_KEY in .env.local for local development or in Vercel for deployment."
            : errText.includes("Sarvam transcription failed")
              ? "Sarvam STT failed. Check SARVAM_API_KEY and the server response in the browser console."
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

  const startListening = async () => {
    setIsRecording(true);
    setAgentState("LISTENING_ACTIVE");
    audioChunks.current = [];
    setError(null);
    setLiveTranscript("");

    try {
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

      const mimeType = resolveRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.start(100);

      intervalRef.current = window.setInterval(() => {
        if (!graphRef.current) return;
        if (isSpeakingRef.current) {
          setLevel(0);
          return;
        }
        const next = getRmsLevel(graphRef.current.analyser);
        levelRef.current = next;
        setLevel(next);
      }, 120);

    } catch (err) {
      console.error("Mic access denied", err);
      setIsRecording(false);
      setAgentState("IDLE");
      setError("Microphone access failed. Check browser permissions.");
    }
  };

  const stopAndSend = () => {
    if (!mediaRecorderRef.current) return;

    setIsRecording(false);
    setAgentState("THINKING");
    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      console.log("Recorder stopped, chunks count:", audioChunks.current.length);
      const audioBlob = new Blob(audioChunks.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
      console.log("Captured audio blob size:", audioBlob.size, "MIME:", audioBlob.type);

      if (audioBlob.size === 0) {
        setAgentState("IDLE");
        setError("No audio captured. Please speak louder or check your mic.");
        return;
      }
      
      try {
        console.log("Converting to WAV...");
        const wavBlob = await convertBlobToWav(audioBlob);
        console.log("WAV blob size:", wavBlob.size);

        const body = new FormData();
        body.append("audio", wavBlob, "recording.wav");
        body.append("language", settings.language);
        body.append("sessionId", sessionId);

        console.log("Sending to /api/transcribe...");
        const sttRes = await fetch("/api/transcribe", {
          method: "POST",
          body,
        });

        if (!sttRes.ok) {
          const errText = await sttRes.text();
          console.error("Transcription API failed:", sttRes.status, errText);
          throw new Error(`Transcription failed: ${sttRes.status}`);
        }
        
        const sttJson = await sttRes.json();
        console.log("STT Result:", sttJson);

        if (sttJson.text) {
          await processTranscript(sttJson.text, sttJson.language, sttJson.confidence);
        } else {
          console.warn("STT returned empty text");
          setAgentState("IDLE");
        }
      } catch (err) {
        console.error("Processing failed:", err);
        setAgentState("IDLE");
        setError(`Speech processing failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        stopListening();
      }
    };
  };

  const handleButtonClick = () => {
    if (!isRecording) {
      startListening();
    } else {
      stopAndSend();
    }
  };

  async function stopListening() {
    setIsRecording(false);
    clearSpeechPauseTimer();
    pendingSpeechTranscriptRef.current = "";
    recorderFallbackStartedRef.current = false;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    recognitionRef.current?.stop();
    graphRef.current?.ctx.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    recognitionRef.current = null;
    graphRef.current = null;
    streamRef.current = null;
    setLevel(0);
  }

  async function speak(text: string, language: string) {
    setAgentState("SPEAKING");
    isSpeakingRef.current = true;
    clearSpeechPauseTimer();
    recognitionRef.current?.stop();
    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}&voiceId=${encodeURIComponent(settings.voiceId)}`;
      const audio = new Audio(url);
      
      await new Promise<void>((resolve) => {
        activeAudioRef.current = audio;
        activeAudioUrlRef.current = url;
        assistantSpeechResolveRef.current = () => {
          activeAudioRef.current = null;
          resolve();
        };

        let fallbackPlayed = false;
        const playFallback = () => {
          if (fallbackPlayed) return;
          fallbackPlayed = true;

          const fallback = new SpeechSynthesisUtterance(text);
          // Keep a reference to prevent Chrome garbage collection bug that cuts off speech mid-sentence
          (window as any)._activeUtterances = (window as any)._activeUtterances || [];
          (window as any)._activeUtterances.push(fallback);

          fallback.lang = (language && language.length <= 5) ? language : "en-US";
          let isResolved = false;
          const safeResolve = () => {
            if (!isResolved) {
              isResolved = true;
              // Clean up the reference to allow GC after completion
              const utterances = (window as any)._activeUtterances;
              if (utterances) {
                const idx = utterances.indexOf(fallback);
                if (idx > -1) utterances.splice(idx, 1);
              }
              resolveAssistantSpeech();
            }
          };

          // Browser Fallback TTS: Hook into onend event
          fallback.onstart = () => {
            setAgentState("SPEAKING");
            isSpeakingRef.current = true;
          };
          fallback.onend = () => {
            safeResolve();
            handleEndOfSpeech(); // Reset to LISTENING state
          };
          fallback.onerror = () => {
            safeResolve();
            handleEndOfSpeech(); // Reset to LISTENING state
          };
          speechSynthesis.speak(fallback);
          
          // Safety timeout in case onend never fires (give it plenty of time so it doesn't cut off)
          const words = text.split(/\s+/).length;
          const timeoutMs = Math.max(10000, (words / 1.5) * 1000 + 5000);
          setTimeout(() => {
            safeResolve();
            handleEndOfSpeech();
          }, timeoutMs);
        };

        // Premium TTS: Hook into onended event
        audio.onended = () => {
          resolveAssistantSpeech();
          handleEndOfSpeech(); // Reset to LISTENING state
        };
        audio.onerror = () => playFallback();
        audio.play().catch(() => playFallback());
      });
    } finally {
      resolveAssistantSpeech();
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
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
            onClick={handleButtonClick}
            disabled={agentState === 'SPEAKING' || agentState === 'THINKING'}
            className={`px-10 py-5 rounded-2xl font-bold text-white transition-all duration-300 ${
              isRecording 
                ? 'bg-red-600 animate-pulse scale-105 shadow-[0_0_20px_rgba(220,38,38,0.5)]' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-xl'
            } disabled:opacity-30 disabled:grayscale`}
          >
            {agentState === 'SPEAKING' ? 'AGENT RESPONDING...' : 
             agentState === 'THINKING' ? 'PROCESSING...' :
             isRecording ? 'CLICK TO SEND' : 'CLICK TO START LISTENING'}
          </button>
        </header>

        <div className="flex flex-col items-center gap-8 mb-8">
          <OrbVisualizer state={agentState} />
          {isRecording && <p className="text-sm text-blue-400 animate-bounce">Recording your input...</p>}
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
