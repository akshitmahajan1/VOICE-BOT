export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-14 md:px-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] md:p-10">
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

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <h2 className="text-lg font-semibold text-slate-100">Contact</h2>
          <p className="mt-2 text-sm text-slate-300">
            Email us directly and we will get back to you as soon as possible.
          </p>
          <a
            href="mailto:akshit.mahajan013@gmail.com"
            className="mt-4 inline-flex rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105"
          >
            akshit.mahajan013@gmail.com
          </a>
        </div>
      </section>
    </main>
  );
}
