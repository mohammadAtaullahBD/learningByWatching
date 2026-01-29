export default function AdminSubtitlesPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Subtitle Uploads</h1>
      <section className="bg-white rounded-xl p-6 shadow space-y-3">
        <p className="text-gray-600">
          Upload subtitles for processing and indexing into the learning catalog.
        </p>
        <div className="border-2 border-dashed rounded-xl p-8 text-center text-gray-500">
          Drag & drop subtitle files here or browse to upload.
        </div>
      </section>
    </main>
  );
}
