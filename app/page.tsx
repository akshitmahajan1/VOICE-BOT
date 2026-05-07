import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="animate-float text-4xl font-bold tracking-tight md:text-6xl">
        Multilingual Voice Agent
      </h1>
      <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
        Real-time listen, transcribe, reason, and speak pipeline with noise-aware
        audio processing and persistent conversation memory.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/agent"
          className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-[0_4px_30px_rgba(255,255,255,0.1)] hover:scale-105"
        >
          Open Agent
        </Link>
        <Link
          href="/about"
          className="rounded-xl border border-white/10 bg-black/10 px-5 py-3 font-semibold text-slate-100 backdrop-blur-md transition-all hover:bg-white/5 hover:scale-105"
        >
          About Us
        </Link>
      </div>
    </main>
  );
}
