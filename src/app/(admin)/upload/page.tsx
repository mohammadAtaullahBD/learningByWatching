import SubtitleUploadForm from "@/components/SubtitleUploadForm";
import { getD1Database } from "@/lib/d1";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type UploadRow = {
  content_id: string;
  episode_id: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  processed_at: string | null;
};

async function fetchUploads(): Promise<UploadRow[]> {
  const db = await getD1Database();
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(
      "SELECT content_id, episode_id, file_name, status, uploaded_at, processed_at FROM subtitle_files ORDER BY uploaded_at DESC LIMIT 10"
    )
    .all<UploadRow>();

  return result.results ?? [];
}

export default async function UploadPage() {
  const uploads = await fetchUploads();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Admin Console
        </p>
        <h1 className="text-4xl font-semibold">Subtitle Ingestion</h1>
        <p className="max-w-2xl text-[color:var(--muted)]">
          Upload subtitles, trigger parsing, and track the vocabulary pipeline from the
          first frame to the learning list.
        </p>
      </header>

      <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Upload new subtitle</h2>
            <p className="text-sm text-[color:var(--muted)]">
              Supports `.vtt`, `.srt`, and `.txt` files. Processing starts immediately.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <SubtitleUploadForm />
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent uploads</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Last 10 records
          </span>
        </div>
        {uploads.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            No uploads yet. Once you submit a subtitle, it will appear here with status
            updates.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr className="border-b border-black/5">
                  <th className="p-3">Content</th>
                  <th className="p-3">Episode</th>
                  <th className="p-3">File</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={`${upload.content_id}-${upload.episode_id}`} className="border-b border-black/5">
                    <td className="p-3 font-medium">{upload.content_id}</td>
                    <td className="p-3">{upload.episode_id}</td>
                    <td className="p-3">{upload.file_name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-[color:var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--text)]">
                        {upload.status}
                      </span>
                    </td>
                    <td className="p-3 text-[color:var(--muted)]">
                      {upload.processed_at ?? upload.uploaded_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
