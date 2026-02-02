import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";
import { isCorruptedMeaning, resolveQuestionCount } from "@/lib/vocab-utils";

const DEFAULT_QUESTIONS = 8;

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
  film_count: number;
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

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { contentId, episodeId } = payload;

  const candidatesResult = await db
    .prepare(
      `WITH film_counts AS (
        SELECT content_id, term, COUNT(*) as film_count
        FROM vocab_occurrences
        GROUP BY content_id, term
      )
      SELECT
        o.term as word,
        COALESCE(MAX(o.lemma), v.lemma, o.term) as lemma,
        COALESCE(MAX(o.pos), v.pos) as pos,
        COALESCE(MAX(o.meaning_bn_override), v.meaning_bn) as meaning,
        COALESCE(MAX(o.is_corrupt_override), v.is_corrupt, 0) as is_corrupt,
        COALESCE(MAX(fc.film_count), 0) as film_count
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.surface_term = o.term
      LEFT JOIN film_counts fc ON fc.content_id = o.content_id AND fc.term = o.term
      WHERE o.content_id = ?1 AND o.episode_id = ?2
      GROUP BY o.term, v.lemma, v.pos, v.meaning_bn, v.is_corrupt, fc.film_count
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
      const isNew = !isWeak && !isLearned;

      return {
        word: row.word,
        lemma,
        pos: row.pos,
        meaning: row.meaning?.trim() ?? "",
        repeatCount: row.film_count ?? 0,
        isWeak,
        isNew,
      };
    });

  const totalAvailable = candidates.length;
  if (totalAvailable === 0) {
    return Response.json({ questions: [], totalAvailable });
  }

  const requestedCount = resolveQuestionCount(
    requested,
    totalAvailable,
    DEFAULT_QUESTIONS,
  );

  const pickedSet = new Set<string>();
  const picked: typeof candidates = [];
  const weightFor = (count: number) => Math.max(1, count);

  const pickFromPool = (pool: typeof candidates, count: number) => {
    if (count <= 0) return 0;
    const available = pool.filter((item) => !pickedSet.has(item.word));
    if (available.length === 0) return count;
    const items = weightedSample(
      available,
      available.map((item) => weightFor(item.repeatCount)),
      Math.min(count, available.length),
    );
    for (const item of items) {
      picked.push(item);
      pickedSet.add(item.word);
    }
    return count - items.length;
  };

  const newPool = candidates.filter((item) => item.isNew);
  const weakPool = candidates.filter((item) => item.isWeak);
  const repeatPool = candidates;

  const hasNew = newPool.length > 0;
  const hasWeak = weakPool.length > 0;

  let newPct = 0;
  let weakPct = 0;
  let repeatPct = 0;
  let lowPct = 0;

  if (hasNew) {
    newPct = 0.95;
    weakPct = 0.04;
    repeatPct = 0.01;
  } else if (hasWeak) {
    weakPct = 0.8;
    repeatPct = 0.2;
  } else {
    repeatPct = 0.85;
    lowPct = 0.15;
  }

  let newTarget = Math.round(requestedCount * newPct);
  let weakTarget = Math.round(requestedCount * weakPct);
  let lowTarget = Math.round(requestedCount * lowPct);
  let repeatTarget = requestedCount - newTarget - weakTarget - lowTarget;

  let leftover = pickFromPool(newPool, newTarget);
  weakTarget += leftover;
  leftover = pickFromPool(weakPool, weakTarget);
  repeatTarget += leftover;
  const lowPoolCount = Math.max(1, Math.ceil(candidates.length * 0.2));
  const lowPool = [...candidates]
    .sort((a, b) => a.repeatCount - b.repeatCount)
    .slice(0, lowPoolCount);
  const weightForLow = (count: number) => 1 / (count + 1);
  const pickFromLowPool = (pool: typeof candidates, count: number) => {
    if (count <= 0) return 0;
    const available = pool.filter((item) => !pickedSet.has(item.word));
    if (available.length === 0) return count;
    const items = weightedSample(
      available,
      available.map((item) => weightForLow(item.repeatCount)),
      Math.min(count, available.length),
    );
    for (const item of items) {
      picked.push(item);
      pickedSet.add(item.word);
    }
    return count - items.length;
  };

  leftover = pickFromLowPool(lowPool, lowTarget);
  repeatTarget += leftover;
  leftover = pickFromPool(repeatPool, repeatTarget);

  if (leftover > 0) {
    const remaining = candidates.filter((item) => !pickedSet.has(item.word));
    const fill = weightedSample(
      remaining,
      remaining.map((item) => weightFor(item.repeatCount)),
      Math.min(leftover, remaining.length),
    );
    for (const item of fill) {
      picked.push(item);
      pickedSet.add(item.word);
    }
  }

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
