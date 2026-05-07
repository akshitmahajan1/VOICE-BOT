"use client";
import React, { useRef, useEffect } from 'react';

export const useAudioVisualizer = (stream: MediaStream | null) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!stream) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    // Smooths out the movement (0.8 is standard for "fluid" visuals)
    analyser.smoothingTimeConstant = 0.8; 
    analyser.fftSize = 256; // Smaller FFT size = faster performance

    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    return () => {
      audioContext.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [stream]);

  return { analyserRef, dataArrayRef };
};

interface Props {
  stream: MediaStream | null;
  isSpeaking: boolean;
}

export const OrbVisualizer: React.FC<Props> = ({ stream, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyserRef, dataArrayRef } = useAudioVisualizer(stream);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as any);
        
        // Clear canvas with a transparent background for Glassmorphism
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          // Gradient: From soft blue to vibrant purple
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, 'rgba(100, 150, 255, 0.5)');
          gradient.addColorStop(1, isSpeaking ? '#ff0080' : '#00d2ff');

          ctx.fillStyle = gradient;
          // Adding a glow effect (ShadowBlur)
          ctx.shadowBlur = 15;
          ctx.shadowColor = isSpeaking ? 'rgba(255, 0, 128, 0.5)' : 'rgba(0, 210, 255, 0.5)';

          // Draw mirrored bars for a balanced "orb" look
          ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);

          x += barWidth + 1;
        }
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    let animationRef = { current: 0 };
    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyserRef, dataArrayRef, isSpeaking]);

  return (
    <div className={`relative flex items-center justify-center p-5 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 transition-all duration-500 ease-in-out ${isSpeaking ? 'shadow-[0_0_40px_rgba(255,0,128,0.4)] scale-105' : 'shadow-[0_0_20px_rgba(0,210,255,0.2)] scale-100'}`}>
      <canvas 
        ref={canvasRef} 
        width={160} 
        height={80} 
        className="w-full h-auto max-w-[160px] opacity-90"
      />
    </div>
  );
};
