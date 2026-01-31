
import { getD1Database } from "@/lib/d1";
import ReportWordButton from "@/components/ReportWordButton";

export const dynamic = "force-dynamic";

type VocabRow = {
  word: string;
  lemma: string | null;
  part_of_speech: string | null;
  meaning: string | null;
  example: string | null;
  content_id: string;
  is_corrupt: number;
};

const isCorruptedMeaning = (value: string | null, flag: number): boolean =>
  flag === 1 || Boolean(value && value.includes("\uFFFD"));

async function fetchEpisodeVocab(episodeId: string): Promise<VocabRow[]> {
  const db = await getD1Database();
  if (!db) return [];

  const result = await db
    .prepare(
      `SELECT
        o.term as word,
        COALESCE(MAX(o.lemma), v.lemma) as lemma,
        COALESCE(MAX(o.pos), v.pos) as part_of_speech,
        COALESCE(MAX(o.meaning_bn_override), v.meaning_bn) as meaning,
        COALESCE(MAX(o.is_corrupt_override), v.is_corrupt, 0) as is_corrupt,
        MIN(o.sentence) as example,
        o.content_id as content_id
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.surface_term = o.term
      WHERE o.episode_id = ?
      GROUP BY o.term, v.meaning_bn, v.pos, v.lemma, v.is_corrupt, o.content_id
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
  const words = (await fetchEpisodeVocab(episodeId)).filter(
    (entry) => !isCorruptedMeaning(entry.meaning, entry.is_corrupt),
  );
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
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{w.word}</span>
                    <ReportWordButton
                      contentId={contentId}
                      episodeId={episodeId}
                      term={w.word}
                    />
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    lemma: {w.lemma ?? "—"}
                  </div>
                </td>
                <td className="p-4 text-[color:var(--muted)]">
                  {w.part_of_speech ?? "—"}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <span>{w.meaning ?? "—"}</span>
                    <ReportWordButton
                      contentId={contentId}
                      episodeId={episodeId}
                      term={w.word}
                    />
                  </div>
                </td>
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
