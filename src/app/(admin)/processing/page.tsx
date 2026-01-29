const jobs = [
  { id: "job-001", title: "Friends S01E01", status: "Queued" },
  { id: "job-002", title: "The Office S01E03", status: "Processing" },
  { id: "job-003", title: "Friends S01E02", status: "Completed" },
];

export default function AdminProcessingPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Processing Status</h1>
      <div className="bg-white rounded-xl shadow">
        <ul className="divide-y">
          {jobs.map(job => (
            <li key={job.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{job.title}</p>
                <p className="text-sm text-gray-500">{job.id}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {job.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
