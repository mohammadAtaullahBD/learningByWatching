
import Link from "next/link";
import { films } from "@/domain/content/fixtures";
import { stats } from "@/domain/progress/fixtures";

export default function Dashboard() {
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow">
          <div className="text-3xl font-bold">{stats.wordsLearned}</div>
          <p>Words Learned</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow">
          <div className="text-3xl font-bold">{stats.progress}%</div>
          <p>Overall Progress</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow">
          <div className="text-3xl font-bold">{stats.episodesStudied}</div>
          <p>Episodes Studied</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold">Series / Movies</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {films.map(f => (
          <div key={f.id} className="bg-white rounded-xl p-6 shadow">
            <h3 className="text-xl font-semibold">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.type} · {f.episodes} Episodes</p>
            <Link href={`/film/${f.id}`} className="inline-block mt-4 bg-black text-white px-4 py-2 rounded-lg">
              Open
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
