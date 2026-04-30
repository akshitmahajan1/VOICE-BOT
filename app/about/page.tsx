export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-14 md:px-8">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 md:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
          About Us
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          We build practical, real-time voice experiences that feel natural in
          conversation. This voice agent combines live transcription, LLM
          reasoning, and responsive text-to-speech to create a smooth assistant
          workflow.
        </p>
        <p className="mt-4 text-base leading-7 text-slate-300">
          For collaboration, support, or product feedback, feel free to contact
          us by email.
        </p>

        <div className="mt-8 rounded-xl border border-slate-600/80 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-slate-100">Contact</h2>
          <p className="mt-2 text-sm text-slate-300">
            Email us directly and we will get back to you as soon as possible.
          </p>
          <a
            href="mailto:your-email@example.com"
            className="mt-4 inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            your-email@example.com
          </a>
        </div>
      </section>
    </main>
  );
}
