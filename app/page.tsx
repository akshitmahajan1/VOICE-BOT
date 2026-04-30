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
          className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-sky-400"
        >
          Open Agent
        </Link>
        <Link
          href="/about"
          className="rounded-xl border border-slate-500 px-5 py-3 font-semibold text-slate-100 transition hover:border-slate-300"
        >
          About Us
        </Link>
      </div>
    </main>
  );
}
