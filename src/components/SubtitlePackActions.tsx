"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  contentId: string;
  episodeId: string;
};

export default function SubtitlePackActions({ contentId, episodeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (!confirm(`Delete vocab pack ${contentId} / ${episodeId}?`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, episodeId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Delete failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete pack"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
