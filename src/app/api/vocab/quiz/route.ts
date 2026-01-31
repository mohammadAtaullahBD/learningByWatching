import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

const MAX_QUESTIONS = 30;
const DEFAULT_QUESTIONS = 8;

const isCorruptedMeaning = (value: string | null, flag: number): boolean =>
  flag === 1 || Boolean(value && value.includes("\uFFFD"));

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const weightedSample = <T,>(items: T[], weights: number[], count: number): T[] => {
  const result: T[] = [];
  const poolItems = [...items];
  const poolWeights = [...weights];
  const picks = Math.min(count, poolItems.length);

  for (let i = 0; i < picks; i += 1) {
    const total = poolWeights.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      result.push(...poolItems.splice(0, picks - i));
      break;
    }

    let threshold = Math.random() * total;
    let index = 0;
    for (let j = 0; j < poolWeights.length; j += 1) {
      threshold -= poolWeights[j];
      if (threshold <= 0) {
        index = j;
        break;
      }
    }

    result.push(poolItems.splice(index, 1)[0]);
    poolWeights.splice(index, 1);
  }

  return result;
};

type QuizPayload = {
  contentId?: string;
  episodeId?: string;
  count?: number;
};

type CandidateRow = {
  word: string;
  lemma: string | null;
  pos: string | null;
  meaning: string | null;
  is_corrupt: number;
};

type StatRow = {
  term: string;
  seen_count: number;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as QuizPayload | null;
  if (!payload?.contentId || !payload.episodeId) {
    return Response.json({ error: "Missing contentId or episodeId" }, { status: 400 });
  }

  const requested = Number(payload.count ?? DEFAULT_QUESTIONS);
  const safeCount = Number.isFinite(requested) ? requested : DEFAULT_QUESTIONS;
  const count = Math.max(1, Math.min(MAX_QUESTIONS, safeCount));

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { contentId, episodeId } = payload;

  const candidatesResult = await db
    .prepare(
      `SELECT
        o.term as word,
        COALESCE(MAX(o.lemma), v.lemma, o.term) as lemma,
        COALESCE(MAX(o.pos), v.pos) as pos,
        COALESCE(MAX(o.meaning_bn_override), v.meaning_bn) as meaning,
        COALESCE(MAX(o.is_corrupt_override), v.is_corrupt, 0) as is_corrupt
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.surface_term = o.term
      WHERE o.content_id = ?1 AND o.episode_id = ?2
      GROUP BY o.term, v.lemma, v.pos, v.meaning_bn, v.is_corrupt
      ORDER BY o.term ASC`,
    )
    .bind(contentId, episodeId)
    .all<CandidateRow>();

  const weakRows = await db
    .prepare(
      "SELECT term FROM word_status WHERE user_id = ?1 AND content_id = ?2 AND episode_id = ?3 AND status = 'weak'",
    )
    .bind(user.username, contentId, episodeId)
    .all<{ term: string }>();

  const learnedRows = await db
    .prepare(
      "SELECT lemma FROM user_lemma_status WHERE user_id = ?1 AND status = 'learned'",
    )
    .bind(user.username)
    .all<{ lemma: string }>();

  const statRows = await db
    .prepare(
      "SELECT term, seen_count FROM user_quiz_stats WHERE user_id = ?1 AND content_id = ?2 AND episode_id = ?3",
    )
    .bind(user.username, contentId, episodeId)
    .all<StatRow>();

  const weakSet = new Set(weakRows.results?.map((row) => row.term) ?? []);
  const learnedSet = new Set(learnedRows.results?.map((row) => row.lemma) ?? []);
  const statsMap = new Map(
    (statRows.results ?? []).map((row) => [row.term, row.seen_count]),
  );

  const candidates = (candidatesResult.results ?? [])
    .filter((row) => row.meaning && !isCorruptedMeaning(row.meaning, row.is_corrupt))
    .map((row) => {
      const lemma = row.lemma ?? row.word;
      const seenCount = statsMap.get(row.word) ?? 0;
      const isWeak = weakSet.has(row.word);
      const isLearned = learnedSet.has(lemma);
      const base = 1 / (1 + seenCount);
      const weakBoost = isWeak ? 3 : 1;
      const learnedPenalty = isLearned ? 0.65 : 1;
      const jitter = 0.9 + Math.random() * 0.2;
      const weight = base * weakBoost * learnedPenalty * jitter;

      return {
        word: row.word,
        lemma,
        pos: row.pos,
        meaning: row.meaning?.trim() ?? "",
        weight,
      };
    });

  const totalAvailable = candidates.length;
  if (totalAvailable === 0) {
    return Response.json({ questions: [], totalAvailable });
  }

  const picked = weightedSample(
    candidates,
    candidates.map((item) => item.weight),
    Math.min(count, totalAvailable),
  );

  const meaningPool = Array.from(
    new Set(candidates.map((item) => item.meaning).filter((meaning) => Boolean(meaning))),
  );

  const questions = picked.map((item) => {
    const distractors = shuffle(
      meaningPool.filter((meaning) => meaning !== item.meaning),
    ).slice(0, 3);
    const options = shuffle([item.meaning, ...distractors]);

    return {
      id: item.word,
      term: item.word,
      lemma: item.lemma,
      pos: item.pos,
      options,
    };
  });

  return Response.json({ questions, totalAvailable });
}
