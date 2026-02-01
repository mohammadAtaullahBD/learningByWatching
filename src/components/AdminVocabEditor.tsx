"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  contentId: string;
  episodeId: string;
  term: string;
  lemma: string;
  pos: string;
  meaning: string;
  suggestedMeaning?: string | null;
  reportCount?: number;
};

export default function AdminVocabEditor({
  contentId,
  episodeId,
  term,
  lemma,
  pos,
  meaning,
  suggestedMeaning,
  reportCount,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lemma, pos, meaning });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (
    action: "update" | "resolve" | "delete" | "applySuggestion",
    override?: { lemma?: string; pos?: string; meaning?: string },
  ) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        contentId,
        episodeId,
        term,
        lemma: override?.lemma ?? form.lemma,
        pos: override?.pos ?? form.pos,
        meaning: override?.meaning ?? form.meaning,
        action,
      };
      const response = await fetch("/api/admin/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Update failed.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {reportCount && reportCount > 0 ? (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            Reports: {reportCount}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[color:var(--muted)] transition hover:border-black/20"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {suggestedMeaning ? (
        <span className="text-[11px] text-[color:var(--muted)]">
          Suggested: {suggestedMeaning}
        </span>
      ) : null}
      {open && (
        <div className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3 text-xs">
          <label className="grid gap-1">
            <span className="text-[color:var(--muted)]">Lemma</span>
            <input
              value={form.lemma}
              onChange={(event) => setForm({ ...form, lemma: event.target.value })}
              className="rounded-lg border border-black/10 px-2 py-1"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[color:var(--muted)]">POS</span>
            <input
              value={form.pos}
              onChange={(event) => setForm({ ...form, pos: event.target.value })}
              className="rounded-lg border border-black/10 px-2 py-1"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[color:var(--muted)]">Meaning (BN)</span>
            <input
              value={form.meaning}
              onChange={(event) => setForm({ ...form, meaning: event.target.value })}
              className="rounded-lg border border-black/10 px-2 py-1"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runAction("update")}
              disabled={saving}
              className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {suggestedMeaning && (
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, meaning: suggestedMeaning }));
                  runAction("applySuggestion", { meaning: suggestedMeaning });
                }}
                disabled={saving}
                className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                Apply suggestion
              </button>
            )}
            <button
              type="button"
              onClick={() => runAction("resolve")}
              disabled={saving}
              className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[color:var(--muted)]"
            >
              Mark OK
            </button>
            <button
              type="button"
              onClick={() => runAction("delete")}
              disabled={saving}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
            >
              Delete
            </button>
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
