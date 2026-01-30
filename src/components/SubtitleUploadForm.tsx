"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function SubtitleUploadForm() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ status: "uploading" });

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/subtitles/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Upload failed.");
      }

      setState({ status: "success", message: "Subtitle uploaded. Processing queued." });
      form.reset();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error during upload.";
      setState({ status: "error", message });
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Content ID
        </span>
        <input
          name="contentId"
          placeholder="friends"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
          autoComplete="off"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Episode ID
        </span>
        <input
          name="episodeId"
          placeholder="friends-ep1"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
          autoComplete="off"
        />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Subtitle file
        </span>
        <input
          name="file"
          type="file"
          accept=".srt,.vtt,.txt"
          required
          className="w-full rounded-xl border border-dashed border-black/20 bg-white px-3 py-3 text-sm"
        />
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state.status === "uploading"}
          className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "uploading" ? "Uploading..." : "Upload subtitles"}
        </button>
        {state.status === "success" && (
          <span className="text-sm text-[color:var(--accent-2)]">{state.message}</span>
        )}
        {state.status === "error" && (
          <span className="text-sm text-red-600">{state.message}</span>
        )}
      </div>
    </form>
  );
}
