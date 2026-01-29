import { getD1Database } from "@/lib/d1";

const STATUS_OPTIONS = ["new", "learned", "weak"] as const;

type VocabStatus = (typeof STATUS_OPTIONS)[number];

type VocabRow = {
  id: string;
  word: string;
  part_of_speech: string;
  meaning: string;
  example: string;
  status: VocabStatus;
};

async function fetchVocab(contentId: string, episodeId: string): Promise<VocabRow[]> {
  const db = getD1Database();
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(
      "SELECT id, word, part_of_speech, meaning, example, status FROM vocab_entries WHERE content_id = ? AND episode_id = ? ORDER BY word ASC"
    )
    .bind(contentId, episodeId)
    .all<VocabRow>();

  return result.results ?? [];
}

function statusClasses(isActive: boolean) {
  if (isActive) {
    return "bg-black text-white";
  }
  return "bg-white text-gray-600 border border-gray-200";
}

export default async function EpisodeVocabPage({
  params,
}: {
  params: Promise<{ contentId: string; episodeId: string }>;
}) {
  const { contentId, episodeId } = await params;
  const vocab = await fetchVocab(contentId, episodeId);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Episode Vocabulary</h1>
        <p className="text-gray-600">
          {contentId} · {episodeId}
        </p>
      </header>

      <section className="bg-white rounded-xl shadow overflow-x-auto">
        {vocab.length === 0 ? (
          <div className="p-6 text-gray-500">
            No vocab entries found yet. Ensure the D1 table `vocab_entries` is
            populated for this episode.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Word</th>
                <th className="p-3 text-left">POS</th>
                <th className="p-3 text-left">Meaning</th>
                <th className="p-3 text-left">Example</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {vocab.map(entry => (
                <tr key={entry.id} className="border-t align-top">
                  <td className="p-3 font-semibold">{entry.word}</td>
                  <td className="p-3 text-gray-500">{entry.part_of_speech}</td>
                  <td className="p-3">{entry.meaning}</td>
                  <td className="p-3 italic text-gray-500">{entry.example}</td>
                  <td className="p-3">
                    <div className="inline-flex rounded-lg bg-gray-50 p-1 gap-1">
                      {STATUS_OPTIONS.map(option => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={entry.status === option}
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${statusClasses(
                            entry.status === option
                          )}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
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
