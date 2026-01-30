import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const runtime = "edge";

export default async function AdminSubtitlesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/subtitles");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Subtitle Library
        </p>
        <h1 className="text-4xl font-semibold">Subtitle Uploads</h1>
      </header>
      <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-[color:var(--muted)]">
          Upload subtitles for processing and indexing into the learning catalog.
        </p>
        <div className="mt-4 rounded-2xl border border-dashed border-black/20 bg-white/60 p-8 text-center text-sm text-[color:var(--muted)]">
          Drag & drop subtitle files here or browse to upload.
        </div>
      </section>
    </main>
  );
}
