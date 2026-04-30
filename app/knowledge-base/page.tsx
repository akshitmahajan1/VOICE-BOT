import { getEntriesByCategory } from "@/lib/knowledge-base";

export default function KnowledgeBasePage() {
  const entriesByCategory = getEntriesByCategory();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 backdrop-blur">
        <h1 className="mb-2 text-3xl font-bold">Knowledge Base Manager</h1>
        <p className="mb-6 text-slate-300">
          This is a reference view of all FAQ entries used by the voice agent. To modify entries, edit{" "}
          <code className="rounded bg-slate-800 px-2 py-1 text-sm">lib/knowledge-base.ts</code>
        </p>

        <div className="space-y-8">
          {Object.entries(entriesByCategory).map(([category, entries]) => (
            <div key={category}>
              <h2 className="mb-4 text-xl font-semibold text-sky-400">{category}</h2>
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-700 bg-slate-950/70 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="font-semibold text-slate-100">{entry.question}</h3>
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
                        {entry.id}
                      </span>
                    </div>
                    <p className="mb-3 text-slate-200">{entry.answer}</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-amber-700/50 bg-amber-900/30 p-4">
          <h3 className="mb-2 font-semibold text-amber-400">How to Edit the Knowledge Base</h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="font-bold text-amber-400">1.</span>
              <span>
                Open <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">lib/knowledge-base.ts</code> in your editor
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-amber-400">2.</span>
              <span>Find the <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">knowledgeBase</code> array</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-amber-400">3.</span>
              <span>Add, edit, or remove entries. Each entry has:</span>
            </li>
          </ol>
          <div className="ml-8 mt-3 space-y-1 rounded bg-slate-950/50 p-3 font-mono text-xs text-slate-400">
            <div>id: unique identifier</div>
            <div>question: the user&apos;s question</div>
            <div>answer: the agent&apos;s response</div>
            <div>keywords: search terms to trigger this answer</div>
            <div>category: grouping for organization</div>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            After editing, refresh the page (the agent will use the new answers immediately).
          </p>
        </div>
      </section>
    </main>
  );
}
