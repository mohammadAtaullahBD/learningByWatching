
import Link from "next/link";
import { films } from "@/domain/content/fixtures";
import { stats } from "@/domain/progress/fixtures";

export default function Dashboard() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-black/5 bg-white/80 p-8 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Progress Snapshot
            </p>
            <h1 className="text-4xl font-semibold">Your learning dashboard</h1>
            <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
              Track your vocabulary momentum by series, episode, and overall mastery.
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            Next goal: Hit 300 learned words this week.
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="text-3xl font-semibold">{stats.wordsLearned}</div>
            <p className="text-sm text-[color:var(--muted)]">Words Learned</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="text-3xl font-semibold">{stats.progress}%</div>
            <p className="text-sm text-[color:var(--muted)]">Overall Progress</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="text-3xl font-semibold">{stats.episodesStudied}</div>
            <p className="text-sm text-[color:var(--muted)]">Episodes Studied</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Series & Movies</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Jump back in
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {films.map((f) => {
            const meta =
              f.type === "Series"
                ? `${f.episodes ?? 0} Episodes`
                : f.runtimeMinutes
                  ? `${f.runtimeMinutes} min`
                  : "Movie";

            return (
              <div
                key={f.id}
                className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{f.title}</h3>
                  <span className="rounded-full bg-[color:var(--surface-muted)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    {f.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{meta}</p>
                <Link
                  href={`/film/${f.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:border-black/10"
                >
                  Open vocab list
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
