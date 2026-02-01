"use client";

import { useState } from "react";

type Props = {
  contentId: string;
  episodeId: string;
  term: string;
  meaning?: string | null;
};

export default function ReportWordButton({
  contentId,
  episodeId,
  term,
  meaning,
}: Props) {
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onReport = async () => {
    if (reported) return;
    setError(null);
    try {
      const response = await fetch("/api/vocab/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          episodeId,
          term,
          observedMeaning: meaning ?? null,
          source: "list",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to report");
      }
      setReported(true);
    } catch {
      setError("Failed");
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onReport}
        className="text-[10px] uppercase tracking-wide text-[color:var(--muted)] opacity-60 transition hover:opacity-100 cursor-pointer"
        title="Report incorrect meaning"
      >
        {reported ? "reported" : "report"}
      </button>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}
    </span>
  );
}
