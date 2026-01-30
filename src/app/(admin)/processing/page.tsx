import { getD1Database } from "@/lib/d1";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type JobRow = {
  content_id: string;
  episode_id: string;
  status: string;
  uploaded_at: string;
  processed_at: string | null;
};

async function fetchJobs(): Promise<JobRow[]> {
  const db = await getD1Database();
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT content_id, episode_id, status, uploaded_at, processed_at
       FROM subtitle_files
       ORDER BY uploaded_at DESC
       LIMIT 20`,
    )
    .all<JobRow>();
  return result.results ?? [];
}

export default async function AdminProcessingPage() {
  const jobs = await fetchJobs();
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
          {jobs.length === 0 ? (
            <li className="p-5 text-sm text-[color:var(--muted)]">
              No jobs yet. Upload a subtitle to see processing status.
            </li>
          ) : (
            jobs.map((job, idx) => {
              const title = `${job.content_id} · ${job.episode_id}`;
              const time = job.processed_at ?? job.uploaded_at;
              return (
                <li key={`${job.content_id}-${job.episode_id}-${idx}`} className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-[color:var(--muted)]">{time}</p>
                  </div>
                    <span className="rounded-full bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--text)]">
                      {job.status}
                    </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </main>
  );
}
