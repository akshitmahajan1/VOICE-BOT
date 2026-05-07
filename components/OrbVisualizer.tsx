"use client";

import React from "react";

export type AgentState = "IDLE" | "LISTENING_ACTIVE" | "THINKING" | "SPEAKING";

interface OrbVisualizerProps {
  state: AgentState;
}

export function OrbVisualizer({ state }: OrbVisualizerProps) {
  const stateConfig = {
    IDLE: {
      color: "rgba(148, 163, 184, 0.5)", // Slate-400
      glow: "rgba(148, 163, 184, 0.2)",
      animation: "animate-pulse",
      scale: "scale-100",
    },
    LISTENING_ACTIVE: {
      color: "rgba(56, 189, 248, 0.8)", // Sky-400
      glow: "rgba(56, 189, 248, 0.4)",
      animation: "animate-pulse shadow-[0_0_40px_rgba(56,189,248,0.6)]",
      scale: "scale-110",
    },
    THINKING: {
      color: "rgba(34, 211, 238, 0.8)", // Cyan-400
      glow: "rgba(34, 211, 238, 0.4)",
      animation: "animate-spin duration-[3000ms] shadow-[0_0_50px_rgba(34,211,238,0.7)]",
      scale: "scale-105",
    },
    SPEAKING: {
      color: "rgba(168, 85, 247, 0.8)", // Purple-500
      glow: "rgba(168, 85, 247, 0.4)",
      animation: "animate-bounce shadow-[0_0_60px_rgba(168,85,247,0.8)]",
      scale: "scale-125",
    },
  };

  const current = stateConfig[state] || stateConfig.IDLE;

  return (
    <div className="relative flex items-center justify-center py-10">
      {/* Outer Glow */}
      <div
        className={`absolute h-40 w-40 rounded-full blur-3xl transition-all duration-700 ${current.glow}`}
        style={{ backgroundColor: current.glow }}
      />
      
      {/* Middle Ring */}
      <div
        className={`absolute h-32 w-32 rounded-full border-2 border-white/10 transition-all duration-700 ${state === "THINKING" ? "animate-spin" : ""}`}
        style={{ borderColor: current.color }}
      />

      {/* Main Orb */}
      <div
        className={`relative h-24 w-24 rounded-full transition-all duration-500 flex items-center justify-center ${current.scale} ${current.animation}`}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${current.color}, rgba(0,0,0,0.4))`,
          boxShadow: `0 0 20px ${current.color}`,
        }}
      >
        {/* Inner Core */}
        <div className="h-12 w-12 rounded-full bg-white/20 blur-sm" />
        
        {/* Waveform particles (visual representation of state) */}
        {state === "SPEAKING" && (
           <div className="absolute inset-0 flex items-center justify-center gap-1">
             {[1, 2, 3, 4, 5].map((i) => (
               <div
                 key={i}
                 className="w-1 rounded-full bg-white/60 animate-wave"
                 style={{
                   height: "20%",
                   animationDelay: `${i * 0.1}s`,
                 }}
               />
             ))}
           </div>
        )}
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 60%; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
