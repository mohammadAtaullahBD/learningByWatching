
import Link from "next/link";
import { episodes } from "@/domain/content/fixtures";

export default function FilmPage({ params }: { params: { filmId: string } }) {
  const eps = episodes[params.filmId] || [];

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold capitalize">{params.filmId}</h1>

      <div className="bg-white rounded-xl shadow">
        {eps.map(ep => (
          <Link key={ep.id} href={`/episode/${ep.id}`} className="block p-4 border-b last:border-b-0">
            <div className="flex justify-between">
              <span>{ep.name}</span>
              <span className="text-gray-500">{ep.words} words</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
