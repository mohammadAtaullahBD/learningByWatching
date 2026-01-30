
import Link from "next/link";
import { episodes } from "@/domain/content/fixtures";

export default async function FilmPage({
  params,
}: {
  params: Promise<{ filmId: string }>;
}) {
  const { filmId } = await params;
  const eps = episodes[filmId] || [];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Series Hub
        </p>
        <h1 className="text-4xl font-semibold capitalize">{filmId}</h1>
        <p className="text-[color:var(--muted)]">
          Pick an episode to review the vocabulary extracted from subtitles.
        </p>
      </header>

      <div className="rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        {eps.map((ep) => (
          <Link
            key={ep.id}
            href={`/episode/${ep.id}`}
            className="flex items-center justify-between gap-4 border-b border-black/5 px-6 py-4 text-sm transition hover:bg-[color:var(--surface-muted)] last:border-b-0"
          >
            <div>
              <p className="font-semibold">{ep.name}</p>
              <p className="text-xs text-[color:var(--muted)]">Episode vocab list</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--muted)] shadow-sm">
              {ep.words} words
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
