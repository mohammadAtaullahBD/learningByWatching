"use client";

import { useState } from "react";

type Props = {
  contentId: string;
  episodeId: string;
  term: string;
};

export default function ReportWordButton({ contentId, episodeId, term }: Props) {
  const [reported, setReported] = useState(false);

  const onReport = async () => {
    if (reported) return;
    await fetch("/api/vocab/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, episodeId, term }),
    });
    setReported(true);
  };

  return (
    <button
      type="button"
      onClick={onReport}
      className="ml-2 text-[10px] uppercase tracking-wide text-[color:var(--muted)] opacity-50 transition hover:opacity-80"
      title="Report incorrect meaning"
    >
      {reported ? "reported" : "report"}
    </button>
  );
}
