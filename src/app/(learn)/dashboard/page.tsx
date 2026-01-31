
import Link from "next/link";
import { getD1Database } from "@/lib/d1";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ContentRow = {
  content_id: string;
  episode_count: number;
  word_count: number;
};

type StatsRow = {
  wordsLearned: number;
  progress: number;
  episodesStudied: number;
};

async function fetchContents(): Promise<ContentRow[]> {
  const db = await getD1Database();
  if (!db) return [];

  const result = await db
    .prepare(
      `SELECT content_id,
        COUNT(DISTINCT episode_id) as episode_count,
        COUNT(DISTINCT term) as word_count
      FROM vocab_occurrences
      GROUP BY content_id
      ORDER BY content_id`,
    )
    .all<ContentRow>();

  return result.results ?? [];
}

async function fetchStats(userId: string | null): Promise<StatsRow> {
  const db = await getD1Database();
  if (!db || !userId) {
    return { wordsLearned: 0, progress: 0, episodesStudied: 0 };
  }

  const totals = await db
    .prepare(
      "SELECT COUNT(DISTINCT COALESCE(lemma, term)) as total FROM vocab_occurrences",
    )
    .first<{ total: number }>();

  const learned = await db
    .prepare(
      "SELECT COUNT(DISTINCT lemma) as learned FROM user_lemma_status WHERE status = 'learned' AND user_id = ?1",
    )
    .bind(userId)
    .first<{ learned: number }>();

  const episodes = await db
    .prepare(
      `SELECT COUNT(DISTINCT o.episode_id) as episodes
       FROM user_lemma_status ls
       JOIN vocab_occurrences o ON COALESCE(o.lemma, o.term) = ls.lemma
       WHERE ls.status = 'learned' AND ls.user_id = ?1`,
    )
    .bind(userId)
    .first<{ episodes: number }>();

  const totalTerms = totals?.total ?? 0;
  const learnedTerms = learned?.learned ?? 0;
  const progress = totalTerms > 0 ? Math.round((learnedTerms / totalTerms) * 100) : 0;

  return {
    wordsLearned: learnedTerms,
    progress,
    episodesStudied: episodes?.episodes ?? 0,
  };
}

export default async function Dashboard() {
  try {
    const user = await getSessionUser();
    const [contents, stats] = await Promise.all([
      fetchContents(),
      fetchStats(user?.username ?? null),
    ]);
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
            {user ? "Next goal: Hit 300 learned words this week." : "Sign in to track progress."}
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
          {contents.length === 0 ? (
            <div className="rounded-3xl border border-black/5 bg-white/85 p-6 text-sm text-[color:var(--muted)] shadow-sm backdrop-blur">
              Upload a subtitle to populate your library.
            </div>
          ) : (
            contents.map((content) => (
              <div
                key={content.content_id}
                className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{content.content_id}</h3>
                  <span className="rounded-full bg-[color:var(--surface-muted)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    Series
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {content.episode_count} Episodes · {content.word_count} words
                </p>
                <Link
                  href={`/film/${content.content_id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:border-black/10"
                >
                  Open vocab list
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
  } catch (error) {
    console.error("dashboard render failed", error);
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
        <p className="text-sm text-[color:var(--muted)]">
          There was an error loading dashboard data. Please try again.
        </p>
      </main>
    );
  }
}
