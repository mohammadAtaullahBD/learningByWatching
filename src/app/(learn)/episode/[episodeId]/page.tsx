
import { getD1Database } from "@/lib/d1";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type VocabRow = {
  word: string;
  part_of_speech: string | null;
  meaning: string | null;
  example: string | null;
  content_id: string;
};

async function fetchEpisodeVocab(episodeId: string): Promise<VocabRow[]> {
  const db = await getD1Database();
  if (!db) return [];

  const result = await db
    .prepare(
      `SELECT
        o.term as word,
        COALESCE(MIN(o.pos), v.pos) as part_of_speech,
        v.meaning_bn as meaning,
        MIN(o.sentence) as example,
        o.content_id as content_id
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.lemma = o.term
      WHERE o.episode_id = ?
      GROUP BY o.term, v.meaning_bn, o.content_id
      ORDER BY o.term ASC`,
    )
    .bind(episodeId)
    .all<VocabRow>();

  return result.results ?? [];
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = await params;
  const words = await fetchEpisodeVocab(episodeId);
  const contentId = words[0]?.content_id ?? "unknown";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Episode Review
        </p>
        <h1 className="text-4xl font-semibold">Episode Vocabulary</h1>
        <p className="text-sm text-[color:var(--muted)]">{contentId}</p>
      </header>

      <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
            <tr className="border-b border-black/5">
              <th className="p-4">Word</th>
              <th className="p-4">POS</th>
              <th className="p-4">Meaning</th>
              <th className="p-4">Example</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.word} className="border-b border-black/5">
                <td className="p-4 font-semibold">{w.word}</td>
                <td className="p-4 text-[color:var(--muted)]">
                  {w.part_of_speech ?? "—"}
                </td>
                <td className="p-4">{w.meaning ?? "—"}</td>
                <td className="p-4 italic text-[color:var(--muted)]">
                  {w.example ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
