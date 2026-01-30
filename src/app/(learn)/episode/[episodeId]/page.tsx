
import { vocab } from "@/domain/vocabulary/fixtures";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = await params;
  const words = vocab[episodeId] || [];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Episode Review
        </p>
        <h1 className="text-4xl font-semibold">Episode Vocabulary</h1>
      </header>

      <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
            <tr className="border-b border-black/5">
              <th className="p-4">Word</th>
              <th className="p-4">POS</th>
              <th className="p-4">Freq</th>
              <th className="p-4">Meaning</th>
              <th className="p-4">Example</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.word} className="border-b border-black/5">
                <td className="p-4 font-semibold">{w.word}</td>
                <td className="p-4 text-[color:var(--muted)]">{w.pos}</td>
                <td className="p-4">{w.freq}</td>
                <td className="p-4">{w.meaning}</td>
                <td className="p-4 italic text-[color:var(--muted)]">{w.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
