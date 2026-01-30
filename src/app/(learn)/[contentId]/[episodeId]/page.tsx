import VocabStatusButtons from "@/components/VocabStatusButtons";
import { getD1Database } from "@/lib/d1";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const USER_ID = "default";
const STATUS_OPTIONS = ["new", "learned", "weak"] as const;

type VocabStatus = (typeof STATUS_OPTIONS)[number];

type VocabRow = {
  word: string;
  part_of_speech: string | null;
  meaning: string | null;
  example: string | null;
  status: VocabStatus;
};

async function fetchVocab(
  contentId: string,
  episodeId: string,
  userId: string,
): Promise<VocabRow[]> {
  const db = await getD1Database();
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(
      `SELECT
        o.term as word,
        COALESCE(MIN(o.pos), v.pos) as part_of_speech,
        v.meaning_bn as meaning,
        MIN(o.sentence) as example,
        COALESCE(ws.status, 'new') as status
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.lemma = o.term
      LEFT JOIN word_status ws
        ON ws.user_id = ? AND ws.content_id = o.content_id AND ws.episode_id = o.episode_id AND ws.term = o.term
      WHERE o.content_id = ? AND o.episode_id = ?
      GROUP BY o.term, ws.status, v.meaning_bn
      ORDER BY o.term ASC`
    )
    .bind(userId, contentId, episodeId)
    .all<VocabRow>();

  return result.results ?? [];
}

export default async function EpisodeVocabPage({
  params,
}: {
  params: Promise<{ contentId: string; episodeId: string }>;
}) {
  const user = await getSessionUser();
  const userId = user?.username ?? USER_ID;
  const { contentId, episodeId } = await params;
  const vocab = await fetchVocab(contentId, episodeId, userId);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Episode Vocabulary
        </p>
        <h1 className="text-4xl font-semibold">{episodeId}</h1>
        <p className="text-[color:var(--muted)]">{contentId}</p>
      </header>

      <section className="overflow-x-auto rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        {!user && (
          <div className="border-b border-black/5 px-6 py-3 text-xs text-[color:var(--muted)]">
            Sign in to save learned/weak status.
          </div>
        )}
        {vocab.length === 0 ? (
          <div className="p-6 text-[color:var(--muted)]">
            No vocab entries found yet. Ensure subtitle processing has populated
            `vocab_occurrences`.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr className="border-b border-black/5">
                <th className="p-4">Word</th>
                <th className="p-4">POS</th>
                <th className="p-4">Meaning</th>
                <th className="p-4">Example</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {vocab.map((entry) => (
                <tr key={entry.word} className="border-b border-black/5 align-top">
                  <td className="p-4 font-semibold">{entry.word}</td>
                  <td className="p-4 text-[color:var(--muted)]">
                    {entry.part_of_speech ?? "—"}
                  </td>
                  <td className="p-4">{entry.meaning ?? "—"}</td>
                  <td className="p-4 italic text-[color:var(--muted)]">
                    {entry.example ?? "—"}
                  </td>
                  <td className="p-4">
                    <VocabStatusButtons
                      contentId={contentId}
                      episodeId={episodeId}
                      term={entry.word}
                      initialStatus={entry.status}
                      options={STATUS_OPTIONS}
                      disabled={!user}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
