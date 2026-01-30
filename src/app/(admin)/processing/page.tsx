const jobs = [
  { id: "job-001", title: "Friends S01E01", status: "Queued" },
  { id: "job-002", title: "The Office S01E03", status: "Processing" },
  { id: "job-003", title: "Friends S01E02", status: "Completed" },
];

export default function AdminProcessingPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Pipeline Monitor
        </p>
        <h1 className="text-4xl font-semibold">Processing Status</h1>
      </header>
      <div className="rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        <ul className="divide-y divide-black/5">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between p-5">
              <div>
                <p className="font-semibold">{job.title}</p>
                <p className="text-sm text-[color:var(--muted)]">{job.id}</p>
              </div>
              <span className="rounded-full bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--text)]">
                {job.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
