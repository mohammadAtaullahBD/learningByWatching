import AdminVocabEditor from "@/components/AdminVocabEditor";
import ReportWordButton from "@/components/ReportWordButton";
import SpeakButton from "@/components/SpeakButton";
import PosFilterSelect from "@/components/PosFilterSelect";
import RepeatSortSelect from "@/components/RepeatSortSelect";
import VocabQuiz from "@/components/VocabQuiz";
import VocabStatusBadge from "@/components/VocabStatusBadge";
import { getD1Database } from "@/lib/d1";
import { getSessionUser } from "@/lib/auth";
import { isCorruptedMeaning } from "@/lib/vocab-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const USER_ID = "default";
type VocabStatus = "new" | "learned" | "weak";

type VocabRow = {
  word: string;
  lemma: string | null;
  part_of_speech: string | null;
  meaning: string | null;
  example: string | null;
  status: VocabStatus;
  is_corrupt: number;
  report_count: number | null;
  suggested_meaning: string | null;
  film_count: number | null;
};

type QuizStatsRow = {
  attempts: number;
  correct: number;
  wrong: number;
};


async function fetchVocab(
  contentId: string,
  episodeId: string,
  userId: string,
): Promise<VocabRow[]> {
  const db = await getD1Database();
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(
      `WITH film_counts AS (
        SELECT content_id, term, COUNT(*) as film_count
        FROM vocab_occurrences
        GROUP BY content_id, term
      )
      SELECT
        o.term as word,
        COALESCE(MAX(o.lemma), v.lemma) as lemma,
        COALESCE(MAX(o.pos), v.pos) as part_of_speech,
        COALESCE(MAX(o.meaning_bn_override), v.meaning_bn) as meaning,
        COALESCE(MAX(o.is_corrupt_override), v.is_corrupt, 0) as is_corrupt,
        MIN(o.sentence) as example,
        COALESCE(MAX(vr.report_count), 0) as report_count,
        MAX(vrl.suggested_meaning) as suggested_meaning,
        COALESCE(MAX(fc.film_count), 0) as film_count,
        CASE
          WHEN MAX(CASE WHEN ws.status = 'weak' THEN 1 ELSE 0 END) = 1 THEN 'weak'
          WHEN MAX(CASE WHEN ls.status = 'learned' OR ws.status = 'learned' THEN 1 ELSE 0 END) = 1 THEN 'learned'
          ELSE 'new'
        END as status
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.surface_term = o.term
      LEFT JOIN (
        SELECT content_id, episode_id, term, MAX(id) as latest_id, COUNT(*) as report_count
        FROM vocab_reports
        WHERE resolved_at IS NULL
        GROUP BY content_id, episode_id, term
      ) vr ON vr.content_id = o.content_id AND vr.episode_id = o.episode_id AND vr.term = o.term
      LEFT JOIN vocab_reports vrl ON vrl.id = vr.latest_id
      LEFT JOIN film_counts fc ON fc.content_id = o.content_id AND fc.term = o.term
      LEFT JOIN word_status ws
        ON ws.user_id = ? AND ws.content_id = o.content_id AND ws.episode_id = o.episode_id AND ws.term = o.term
      LEFT JOIN user_lemma_status ls
        ON ls.user_id = ? AND ls.lemma = COALESCE(o.lemma, v.lemma, o.term)
      WHERE o.content_id = ? AND o.episode_id = ?
      GROUP BY o.term, v.meaning_bn, v.pos, v.lemma, v.is_corrupt, vr.report_count, vrl.suggested_meaning, fc.film_count
      ORDER BY COALESCE(MAX(o.lemma), v.lemma, o.term) ASC, o.term ASC`
    )
    .bind(userId, userId, contentId, episodeId)
    .all<VocabRow>();

  return result.results ?? [];
}

async function fetchQuizStats(
  contentId: string,
  episodeId: string,
  userId: string,
): Promise<QuizStatsRow> {
  const db = await getD1Database();
  if (!db) {
    return { attempts: 0, correct: 0, wrong: 0 };
  }

  const row = await db
    .prepare(
      `SELECT
        COALESCE(SUM(seen_count), 0) as attempts,
        COALESCE(SUM(correct_count), 0) as correct,
        COALESCE(SUM(wrong_count), 0) as wrong
       FROM user_quiz_stats
       WHERE user_id = ?1 AND content_id = ?2 AND episode_id = ?3`,
    )
    .bind(userId, contentId, episodeId)
    .first<QuizStatsRow>();

  return row ?? { attempts: 0, correct: 0, wrong: 0 };
}

export default async function EpisodeVocabPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; episodeId: string }>;
  searchParams?: Promise<{
    filter?: string | string[];
    status?: string | string[];
    pos?: string | string[];
    repeat?: string | string[];
    page?: string | string[];
  }>;
}) {
  const user = await getSessionUser();
  const userId = user?.username ?? USER_ID;
  const isAdmin = user?.role === "admin";
  const { contentId, episodeId } = await params;
  const query = (await searchParams) ?? {};
  const getParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const filter = getParam(query.filter);
  const statusParam = getParam(query.status);
  const posParam = getParam(query.pos);
  const repeatParam = getParam(query.repeat);
  const pageParam = getParam(query.page);
  const filterCorrupt = filter === "corrupt";
  const filterReported = filter === "reported";
  const filterNone = !filterCorrupt && !filterReported;
  const [vocabRaw, quizStats] = await Promise.all([
    fetchVocab(contentId, episodeId, userId),
    user ? fetchQuizStats(contentId, episodeId, userId) : Promise.resolve({ attempts: 0, correct: 0, wrong: 0 }),
  ]);
  const dedupedRaw = Array.from(
    vocabRaw.reduce((map, entry) => {
      const key = `${entry.word}::${entry.part_of_speech ?? "unknown"}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
        return map;
      }

      const merged: VocabRow = {
        ...existing,
        lemma: existing.lemma ?? entry.lemma,
        part_of_speech: existing.part_of_speech ?? entry.part_of_speech,
        meaning: existing.meaning ?? entry.meaning,
        example: existing.example ?? entry.example,
        report_count: Math.max(existing.report_count ?? 0, entry.report_count ?? 0),
        suggested_meaning: existing.suggested_meaning ?? entry.suggested_meaning,
        film_count: Math.max(existing.film_count ?? 0, entry.film_count ?? 0),
        status:
          existing.status === "weak" || entry.status === "weak"
            ? "weak"
            : existing.status === "learned" || entry.status === "learned"
              ? "learned"
              : "new",
      };

      map.set(key, merged);
      return map;
    }, new Map<string, VocabRow>()),
  ).map((entry) => entry[1]);

  const vocab = dedupedRaw.filter((entry) => {
    const corrupted = isCorruptedMeaning(entry.meaning, entry.is_corrupt);
    if (isAdmin && filterCorrupt) return corrupted;
    if (isAdmin && filterReported) return (entry.report_count ?? 0) > 0;
    if (isAdmin) return true;
    return !corrupted;
  });
  const totalCount = vocab.length;
  const learnedCount = vocab.filter((entry) => entry.status === "learned").length;
  const weakCount = vocab.filter((entry) => entry.status === "weak").length;
  const newCount = vocab.filter((entry) => entry.status === "new").length;
  const masteryPct = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  const quizAccuracy =
    quizStats.attempts > 0
      ? Math.round((quizStats.correct / quizStats.attempts) * 100)
      : null;
  const statusFilter = statusParam && ["new", "weak", "learned"].includes(statusParam)
    ? (statusParam as VocabStatus)
    : "all";
  const posFilter = posParam ?? "all";
  const repeatFilter = repeatParam && ["count_desc", "count_asc"].includes(repeatParam)
    ? repeatParam
    : "none";
  const filteredVocab = vocab.filter((entry) => {
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    if (posFilter !== "all" && (entry.part_of_speech ?? "unknown") !== posFilter) return false;
    return true;
  });
  const sortedVocab = [...filteredVocab];
  if (repeatFilter !== "none") {
    sortedVocab.sort((a, b) => {
      const aCount = a.film_count ?? 0;
      const bCount = b.film_count ?? 0;
      if (repeatFilter === "count_desc") return bCount - aCount;
      if (repeatFilter === "count_asc") return aCount - bCount;
      return 0;
    });
  }
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(sortedVocab.length / pageSize));
  const currentPageRaw = Number(pageParam ?? "1");
  const currentPage = Number.isFinite(currentPageRaw)
    ? Math.min(Math.max(1, currentPageRaw), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const pageVocab = sortedVocab.slice(pageStart, pageStart + pageSize);
  const buildHref = (updates: Partial<Record<"filter" | "status" | "pos" | "repeat" | "page", string | null>>) => {
    const next = {
      filter: filter ?? null,
      status: statusFilter === "all" ? null : statusFilter,
      pos: posFilter === "all" ? null : posFilter,
      repeat: repeatFilter === "none" ? null : repeatFilter,
      page: currentPage > 1 ? String(currentPage) : null,
      ...updates,
    };
    const params = new URLSearchParams();
    if (next.filter) params.set("filter", next.filter);
    if (next.status) params.set("status", next.status);
    if (next.pos) params.set("pos", next.pos);
    if (next.repeat) params.set("repeat", next.repeat);
    if (next.page && next.page !== "1") params.set("page", next.page);
    const queryString = params.toString();
    return queryString
      ? `/${contentId}/${episodeId}?${queryString}`
      : `/${contentId}/${episodeId}`;
  };
  const posOptions = Array.from(
    new Set(vocab.map((entry) => entry.part_of_speech ?? "unknown")),
  ).sort((a, b) => a.localeCompare(b));
  const posHrefMap = Object.fromEntries(
    posOptions.map((pos) => [pos, buildHref({ pos, page: "1" })]),
  );
  const posAllHref = buildHref({ pos: null, page: "1" });
  const repeatOptions = [
    { value: "none", label: "Default order" },
    { value: "count_desc", label: "Repeats: high → low" },
    { value: "count_asc", label: "Repeats: low → high" },
  ];
  const repeatHrefMap = Object.fromEntries(
    repeatOptions.map((option) => [option.value, buildHref({ repeat: option.value === "none" ? null : option.value, page: "1" })]),
  );
  const pageSteps: Array<number | "gap"> = [];
  for (let i = 1; i <= totalPages; i += 1) {
    const isEdge = i === 1 || i === totalPages;
    const isNear = i >= currentPage - 2 && i <= currentPage + 2;
    if (isEdge || isNear) {
      pageSteps.push(i);
    } else if (pageSteps[pageSteps.length - 1] !== "gap") {
      pageSteps.push("gap");
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Episode Vocabulary
        </p>
        <h1 className="text-4xl font-semibold">{episodeId}</h1>
        <p className="text-[color:var(--muted)]">{contentId}</p>
      </header>
      {isAdmin && (
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={buildHref({ filter: null, page: "1" })}
            className={`rounded-full border px-3 py-1 ${
              filterNone ? "border-black/20 text-[color:var(--text)]" : "border-black/10 text-[color:var(--muted)]"
            }`}
          >
            All
          </Link>
          <Link
            href={buildHref({ filter: "corrupt", page: "1" })}
            className={`rounded-full border px-3 py-1 ${
              filterCorrupt ? "border-orange-300 text-orange-700" : "border-black/10 text-[color:var(--muted)]"
            }`}
          >
            Corrupt only
          </Link>
          <Link
            href={buildHref({ filter: "reported", page: "1" })}
            className={`rounded-full border px-3 py-1 ${
              filterReported ? "border-emerald-300 text-emerald-700" : "border-black/10 text-[color:var(--muted)]"
            }`}
          >
            Reported only
          </Link>
        </div>
      )}

      <VocabQuiz contentId={contentId} episodeId={episodeId} disabled={!user} />

      <section
        id="word-list"
        className="vocab-list overflow-x-auto rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-6 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Episode stats
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={buildHref({ status: null, page: "1" })}
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "all"
                  ? "border-black/20 text-[color:var(--text)]"
                  : "border-black/10 text-[color:var(--muted)]"
              }`}
            >
              Total {totalCount}
            </Link>
            <Link
              href={buildHref({ status: "new", page: "1" })}
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "new"
                  ? "border-orange-300 text-orange-700"
                  : "border-black/10 text-[color:var(--muted)]"
              }`}
            >
              New {newCount}
            </Link>
            <Link
              href={buildHref({ status: "weak", page: "1" })}
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "weak"
                  ? "border-rose-300 text-rose-700"
                  : "border-black/10 text-[color:var(--muted)]"
              }`}
            >
              Weak {weakCount}
            </Link>
            <Link
              href={buildHref({ status: "learned", page: "1" })}
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "learned"
                  ? "border-emerald-300 text-emerald-700"
                  : "border-black/10 text-[color:var(--muted)]"
              }`}
            >
              Learned {learnedCount}
            </Link>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[color:var(--muted)]">
              Mastery {masteryPct}%
            </span>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[color:var(--muted)]">
              Quiz accuracy {quizAccuracy === null ? "—" : `${quizAccuracy}%`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-b border-black/5 px-6 py-3 text-xs">
          <PosFilterSelect
            value={posFilter}
            options={posOptions}
            hrefAll={posAllHref}
            hrefByPos={posHrefMap}
          />
          <RepeatSortSelect
            value={repeatFilter}
            options={repeatOptions}
            hrefByValue={repeatHrefMap}
          />
        </div>
        {!user && (
          <div className="border-b border-black/5 px-6 py-3 text-xs text-[color:var(--muted)]">
            Sign in to take the test and track status.
          </div>
        )}
        {vocab.length === 0 ? (
          <div className="p-6 text-[color:var(--muted)]">
            No vocab entries found yet. Ensure subtitle processing has populated
            `vocab_occurrences`.
          </div>
        ) : filteredVocab.length === 0 ? (
          <div className="p-6 text-[color:var(--muted)]">
            No vocab entries match the selected filters.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr className="border-b border-black/5">
                  <th className="p-4">Word</th>
                  <th className="p-4">POS</th>
                  <th className="p-4">Meaning</th>
                  <th className="p-4">Example</th>
                  <th className="p-4">Status</th>
                  {isAdmin && <th className="p-4">Admin</th>}
                </tr>
              </thead>
              <tbody>
                {pageVocab.map((entry) => (
                  <tr
                    key={`${entry.word}-${entry.part_of_speech ?? "unknown"}`}
                    className="border-b border-black/5 align-top"
                  >
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{entry.word}</span>
                      <SpeakButton text={entry.word} />
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      lemma: {entry.lemma ?? "—"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      repeats: {entry.film_count ?? 0}
                    </div>
                  </td>
                    <td className="p-4 text-[color:var(--muted)]">
                      {entry.part_of_speech ?? "—"}
                    </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span>{entry.meaning ?? "—"}</span>
                      <ReportWordButton
                        contentId={contentId}
                        episodeId={episodeId}
                        term={entry.word}
                        meaning={entry.meaning}
                      />
                    </div>
                  </td>
                    <td className="p-4 italic text-[color:var(--muted)]">
                      {entry.example ?? "—"}
                    </td>
                    <td className="p-4">
                      <VocabStatusBadge status={entry.status} />
                    </td>
                    {isAdmin && (
                      <td className="p-4">
                        <AdminVocabEditor
                          contentId={contentId}
                          episodeId={episodeId}
                          term={entry.word}
                          lemma={entry.lemma ?? entry.word}
                          pos={entry.part_of_speech ?? "unknown"}
                          meaning={entry.meaning ?? ""}
                          suggestedMeaning={entry.suggested_meaning}
                          reportCount={entry.report_count ?? 0}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-6 py-4 text-xs text-[color:var(--muted)]">
              <span>
                Page {currentPage} of {totalPages} · Showing{" "}
                {filteredVocab.length === 0 ? 0 : pageStart + 1}-
                {Math.min(pageStart + pageSize, filteredVocab.length)} of {filteredVocab.length}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
                  aria-disabled={currentPage === 1}
                  className={`rounded-full border px-3 py-1 ${
                    currentPage === 1
                      ? "border-black/5 text-[color:var(--muted)]"
                      : "border-black/10 text-[color:var(--text)]"
                  }`}
                >
                  Prev
                </Link>
                {pageSteps.map((step, index) =>
                  step === "gap" ? (
                    <span key={`gap-${index}`} className="px-2 text-[color:var(--muted)]">
                      …
                    </span>
                  ) : (
                    <Link
                      key={step}
                      href={buildHref({ page: String(step) })}
                      className={`rounded-full border px-3 py-1 ${
                        step === currentPage
                          ? "border-black/20 text-[color:var(--text)]"
                          : "border-black/10 text-[color:var(--muted)]"
                      }`}
                    >
                      {step}
                    </Link>
                  ),
                )}
                <Link
                  href={buildHref({ page: String(Math.min(totalPages, currentPage + 1)) })}
                  aria-disabled={currentPage === totalPages}
                  className={`rounded-full border px-3 py-1 ${
                    currentPage === totalPages
                      ? "border-black/5 text-[color:var(--muted)]"
                      : "border-black/10 text-[color:var(--text)]"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
