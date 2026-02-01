import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";
import { getMeaningAndPersist, type GoogleTranslateEnv } from "@/domain/vocabulary/meaning";

const DEFAULT_COST_PER_MILLION = 20;
const MAX_PROCESS_PER_REQUEST = 120;
const MAX_PROCESS_DURATION_MS = 15_000;

type MeaningsPayload = {
  contentId?: string;
  episodeId?: string;
  action?: "stats" | "process";
};

type CandidateRow = {
  term: string;
  lemma: string | null;
  pos: string | null;
  sentence: string | null;
  cached: string | null;
  vocab: string | null;
};

type EnvWithDb = CloudflareEnv & {
  VOCAB_DB?: D1Database;
  GOOGLE_TRANSLATE_API_KEY?: string;
  GOOGLE_TRANSLATE_COST_PER_MILLION?: string;
};

const isFilled = (value: string | null): boolean => Boolean(value && value.trim());

const buildStats = (rows: CandidateRow[]) => {
  let totalTerms = 0;
  let existingCount = 0;
  let missingCount = 0;
  let estimatedChars = 0;

  for (const row of rows) {
    totalTerms += 1;
    const hasMeaning = isFilled(row.cached) || isFilled(row.vocab);
    if (hasMeaning) {
      existingCount += 1;
    } else {
      missingCount += 1;
      estimatedChars += row.term.length;
    }
  }

  return { totalTerms, existingCount, missingCount, estimatedChars };
};

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as MeaningsPayload | null;
  const { contentId, episodeId, action } = payload ?? {};
  if (!contentId || !episodeId || !action) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const rows = await db
    .prepare(
      `WITH candidates AS (
        SELECT
          o.term as term,
          COALESCE(MAX(o.lemma), o.term) as lemma,
          COALESCE(MAX(o.pos), 'unknown') as pos,
          MIN(o.sentence) as sentence,
          LOWER(o.term) || '::' || LOWER(COALESCE(MAX(o.pos), 'unknown')) as cache_key
        FROM vocab_occurrences o
        WHERE o.content_id = ?1 AND o.episode_id = ?2
        GROUP BY o.term
      )
      SELECT
        c.term as term,
        c.lemma as lemma,
        c.pos as pos,
        c.sentence as sentence,
        tc.meaning_bn as cached,
        v.meaning_bn as vocab
      FROM candidates c
      LEFT JOIN translation_cache tc ON tc.cache_key = c.cache_key
      LEFT JOIN vocabulary v ON v.surface_term = c.term AND v.pos = c.pos
      ORDER BY c.term ASC`,
    )
    .bind(contentId, episodeId)
    .all<CandidateRow>();

  const candidates = rows.results ?? [];
  const stats = buildStats(candidates);

  const costPerMillion = Number(
    (env as EnvWithDb).GOOGLE_TRANSLATE_COST_PER_MILLION ?? DEFAULT_COST_PER_MILLION,
  );
  const estimatedCostUsd =
    costPerMillion > 0
      ? Number(((stats.estimatedChars / 1_000_000) * costPerMillion).toFixed(4))
      : 0;

  if (action === "stats") {
    return Response.json({
      ...stats,
      estimatedCostUsd,
    });
  }

  if (!(env as EnvWithDb).GOOGLE_TRANSLATE_API_KEY) {
    return Response.json(
      { error: "Google Translate API key not configured" },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const row of candidates) {
    if (
      processedCount >= MAX_PROCESS_PER_REQUEST ||
      Date.now() - startedAt > MAX_PROCESS_DURATION_MS
    ) {
      break;
    }

    const hasMeaning = isFilled(row.cached) || isFilled(row.vocab);
    if (hasMeaning) {
      skippedCount += 1;
      continue;
    }

    try {
      const result = await getMeaningAndPersist({
        db,
        surfaceTerm: row.term,
        lemma: row.lemma ?? row.term,
        pos: row.pos ?? "unknown",
        exampleSentence: row.sentence ?? "",
        env: env as GoogleTranslateEnv,
      });

      if (result.changed) {
        await db
          .prepare(
            `UPDATE vocab_occurrences
             SET is_corrupt_override = 1
             WHERE content_id = ?1 AND episode_id = ?2 AND term = ?3`,
          )
          .bind(contentId, episodeId, row.term)
          .run();
      }

      processedCount += 1;
    } catch (error) {
      // Skip failures but keep processing others.
      failedCount += 1;
    }
  }

  const remainingCount = Math.max(0, stats.missingCount - processedCount);

  return Response.json({
    ...stats,
    estimatedCostUsd,
    processedCount,
    skippedCount,
    failedCount,
    remainingCount,
    completed: remainingCount === 0,
  });
}
