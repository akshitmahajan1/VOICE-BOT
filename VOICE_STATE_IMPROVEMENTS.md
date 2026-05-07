# Voice State Management Improvements

## Update 1: Enhanced handleEndOfSpeech Callback

**Location:** `components/VoiceAgent.tsx` - Replace the `handleEndOfSpeech` function with:

```typescript
const handleEndOfSpeech = () => {
  // Reset agent state to LISTENING (Orb turns Blue)
  setIsSpeaking(false);
  isSpeakingRef.current = false;

  // Clear any "Speech Detection" flags to allow fresh transcription
  processingRef.current = false;
  pendingSpeechTranscriptRef.current = "";

  // 1. Force Resume Audio Context (Browsers often suspend it after output)
  if (graphRef.current?.ctx.state === "suspended") {
    graphRef.current.ctx.resume().catch(() => undefined);
    console.log("AudioContext resumed from suspended state");
  }

  // 2. Restart the Noise Gate / MediaRecorder
  // We use a small timeout to let the hardware switch from Output to Input mode
  setTimeout(() => {
    if (isListening) {
      // Restart browser speech recognition if available
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          console.log("Browser speech recognition re-activated");
        }
      } catch {
        // Already started or not available
      }

      // Restart MediaRecorder if it's inactive
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === "inactive") {
          mediaRecorderRef.current.start(5000);
          console.log("MediaRecorder re-activated for follow-up transcription");
        } else if (mediaRecorderRef.current.state === "recording") {
          // Reset the recorder to ensure clean state
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start(5000);
          console.log("MediaRecorder restarted for clean state");
        }
      }
    }
  }, 300); // 300ms allows hardware to switch from Output to Input mode
};
```

## Update 2: Verify Audio Context Configuration

**Location:** `components/VoiceAgent.tsx` - In `startListening()` function, confirm the `getUserMedia` call has:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
});
```

✅ This is already correctly configured in your current code.

## Update 3: Verify Audio Processing Loop

The audio processing loop in the `setInterval` already has proper SPEAKING state check:

```typescript
// CRITICAL: When agent is speaking (SPEAKING state), disable noise gate completely
if (isSpeakingRef.current) {
  setLevel(0);
  return;
}
```

✅ This is already correctly implemented.

## Update 4: Verify processAudioChunk State Check

The `processAudioChunk` function should verify agent is LISTENING before processing. Current code has:

```typescript
async function processAudioChunk(blob: Blob) {
  if (processingRef.current) return;
  if (isSpeakingRef.current) return;  // ✅ Already prevents processing during SPEAKING
  if (pendingSpeechTranscriptRef.current) return;
  // ... rest of function
}
```

✅ This is already correctly protecting against SPEAKING state.

## Key Changes Summary

| Change | Location | Purpose |
|--------|----------|---------|
| Clear `processingRef` & `pendingSpeechTranscriptRef` | handleEndOfSpeech | Allows fresh transcription on follow-ups |
| Add console.log statements | handleEndOfSpeech | Better debugging visibility |
| Increase timeout 200ms → 300ms | handleEndOfSpeech | Hardware output→input mode switch time |
| Check MediaRecorder state more thoroughly | handleEndOfSpeech | Handle inactive vs recording states properly |

## Testing Checklist

After implementing these changes:

- [ ] Agent stops speaking → Orb turns blue
- [ ] Blue orb appears within 300ms
- [ ] Console shows "AudioContext resumed from suspended state"
- [ ] Console shows "MediaRecorder re-activated" or "restarted"
- [ ] Speak a follow-up question after agent response
- [ ] Waveform animates on follow-up input
- [ ] Audio is captured and sent to Sarvam STT
- [ ] LLM generates response for follow-up

## Troubleshooting

**Problem:** Agent stops speaking but Orb stays purple
- Check browser console for error messages
- Verify `handleEndOfSpeech` is being called

**Problem:** Orb turns blue but no microphone input detected
- Check if `echoCancellation: true` and `autoGainControl: true` are set
- Verify browser didn't block microphone access
- Check console for "MediaRecorder re-activated" message

**Problem:** Follow-up transcription fails
- Ensure `processingRef.current` is reset to false in `handleEndOfSpeech`
- Verify Sarvam API key is configured
- Check `/api/transcribe` response in Network tab of DevTools
