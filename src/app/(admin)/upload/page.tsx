import { getD1Database } from "@/lib/d1";

type UploadRow = {
  id: string;
  content_id: string;
  episode_id: string;
  file_name: string;
  status: string;
  created_at: string;
};

async function fetchUploads(): Promise<UploadRow[]> {
  const db = getD1Database();
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(
      "SELECT id, content_id, episode_id, file_name, status, created_at FROM subtitle_uploads ORDER BY created_at DESC LIMIT 10"
    )
    .all<UploadRow>();

  return result.results ?? [];
}

export default async function UploadPage() {
  const uploads = await fetchUploads();

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Subtitle Upload</h1>
        <p className="text-gray-600">
          Admin-only area for uploading subtitle files and tracking ingestion status.
        </p>
      </header>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Upload new subtitle</h2>
        <form className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Content ID</span>
            <input
              name="contentId"
              placeholder="show-123"
              className="w-full rounded-lg border px-3 py-2"
              autoComplete="off"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Episode ID</span>
            <input
              name="episodeId"
              placeholder="episode-5"
              className="w-full rounded-lg border px-3 py-2"
              autoComplete="off"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Subtitle file</span>
            <input
              name="subtitleFile"
              type="file"
              accept=".srt,.vtt"
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>
          <button
            type="button"
            className="md:col-span-2 bg-black text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Upload (admin)
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent uploads</h2>
          <span className="text-sm text-gray-500">Last 10 records</span>
        </div>
        {uploads.length === 0 ? (
          <p className="text-gray-500">
            No upload records found yet. Connect the D1 table `subtitle_uploads` to
            populate this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Content</th>
                  <th className="p-3 text-left">Episode</th>
                  <th className="p-3 text-left">File</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(upload => (
                  <tr key={upload.id} className="border-t">
                    <td className="p-3 font-medium">{upload.content_id}</td>
                    <td className="p-3">{upload.episode_id}</td>
                    <td className="p-3">{upload.file_name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {upload.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{upload.created_at}</td>
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
