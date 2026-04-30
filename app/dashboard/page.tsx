export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold">Conversation Dashboard</h1>
        <p className="mt-2 text-slate-300">
          This view can be wired to Supabase or Vercel Postgres for analytics,
          transcript review, and user memory management controls.
        </p>
      </section>
    </main>
  );
}
