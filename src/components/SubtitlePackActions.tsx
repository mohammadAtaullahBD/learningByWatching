"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  contentId: string;
  episodeId: string;
};

type MeaningStats = {
  totalTerms: number;
  existingCount: number;
  missingCount: number;
  estimatedChars: number;
  estimatedCostUsd: number;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  remainingCount?: number;
  completed?: boolean;
};

export default function SubtitlePackActions({ contentId, episodeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MeaningStats | null>(null);

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

  const fetchStats = async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/meanings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, episodeId, action: "stats" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Failed to fetch stats.");
      }
      const payload = (await response.json()) as MeaningStats;
      setStats(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats.");
    } finally {
      setStatsLoading(false);
    }
  };

  const processMeanings = async () => {
    setProcessing(true);
    setError(null);
    try {
      let safety = 0;
      let lastPayload: MeaningStats | null = null;

      while (safety < 20) {
        const response = await fetch("/api/admin/meanings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, episodeId, action: "process" }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Failed to process meanings.");
        }
        const payload = (await response.json()) as MeaningStats;
        lastPayload = payload;
        setStats(payload);

        const remaining = payload.remainingCount ?? 0;
        const processed = payload.processedCount ?? 0;
        if (remaining > 0 && processed > 0) {
          safety += 1;
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }

        if (remaining > 0 && processed === 0) {
          setError("No progress made. Daily limit or API errors may have stopped processing.");
        }
        break;
      }

      if (!lastPayload) {
        throw new Error("Failed to process meanings.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process meanings.");
    } finally {
      setProcessing(false);
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
      <button
        type="button"
        onClick={fetchStats}
        disabled={statsLoading}
        className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[color:var(--text)] transition hover:border-black/20 disabled:opacity-50"
      >
        {statsLoading ? "Checking..." : "Check meanings"}
      </button>
      <button
        type="button"
        onClick={processMeanings}
        disabled={processing}
        className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:opacity-50"
      >
        {processing ? "Processing..." : "Process meanings"}
      </button>
      {stats && (
        <div className="rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs text-[color:var(--muted)]">
          <div>Total terms: {stats.totalTerms}</div>
          <div>Known meanings: {stats.existingCount}</div>
          <div>Missing meanings: {stats.missingCount}</div>
          <div>Est. chars: {stats.estimatedChars}</div>
          <div>Est. cost: ${stats.estimatedCostUsd}</div>
          {typeof stats.processedCount === "number" && (
            <div>
              Processed: {stats.processedCount} · Skipped: {stats.skippedCount ?? 0}
            </div>
          )}
          {typeof stats.failedCount === "number" && (
            <div>Failed: {stats.failedCount}</div>
          )}
          {typeof stats.remainingCount === "number" && (
            <div>Remaining: {stats.remainingCount}</div>
          )}
        </div>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
