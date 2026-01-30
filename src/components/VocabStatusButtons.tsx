"use client";

import { useState } from "react";

type StatusOption = "new" | "learned" | "weak";

type Props = {
  contentId: string;
  episodeId: string;
  term: string;
  initialStatus: StatusOption;
  options: readonly StatusOption[];
  disabled?: boolean;
};

export default function VocabStatusButtons({
  contentId,
  episodeId,
  term,
  initialStatus,
  options,
  disabled = false,
}: Props) {
  const [status, setStatus] = useState<StatusOption>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const updateStatus = async (nextStatus: StatusOption) => {
    if (disabled || nextStatus === status || isSaving) return;
    const previous = status;
    setStatus(nextStatus);
    setIsSaving(true);

    try {
      const response = await fetch("/api/vocab/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, episodeId, term, status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to save status");
      }
    } catch (error) {
      setStatus(previous);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="inline-flex gap-1 rounded-full border border-black/5 bg-white p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={status === option}
          onClick={() => updateStatus(option)}
          disabled={disabled}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === option
              ? "bg-[color:var(--accent)] text-white"
              : "bg-white text-[color:var(--muted)] border border-black/10"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
