import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voice Agent MVP",
    short_name: "VoiceAgent",
    description: "Multilingual real-time conversational voice assistant",
    start_url: "/agent",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0ea5e9",
  };
}
