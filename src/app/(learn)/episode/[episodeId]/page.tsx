
import { vocab } from "@/domain/vocabulary/fixtures";

export default function EpisodePage({ params }: { params: { episodeId: string } }) {
  const words = vocab[params.episodeId] || [];

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Episode Vocabulary</h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Word</th>
              <th>POS</th>
              <th>Freq</th>
              <th>Meaning</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            {words.map(w => (
              <tr key={w.word} className="border-t">
                <td className="p-3 font-semibold">{w.word}</td>
                <td>{w.pos}</td>
                <td>{w.freq}</td>
                <td>{w.meaning}</td>
                <td className="italic text-sm">{w.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
