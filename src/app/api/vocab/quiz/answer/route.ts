import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

type AnswerPayload = {
  contentId?: string;
  episodeId?: string;
  term?: string;
  selectedMeaning?: string;
};

type AnswerRow = {
  meaning: string | null;
  lemma: string | null;
  is_corrupt: number;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

const normalize = (value: string | null | undefined) => (value ?? "").trim();

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as AnswerPayload | null;
  const { contentId, episodeId, term, selectedMeaning } = payload ?? {};
  if (!contentId || !episodeId || !term || !selectedMeaning) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const row = await db
    .prepare(
      `SELECT
        COALESCE(MAX(o.meaning_bn_override), v.meaning_bn) as meaning,
        COALESCE(MAX(o.lemma), v.lemma, o.term) as lemma,
        COALESCE(MAX(o.is_corrupt_override), v.is_corrupt, 0) as is_corrupt
      FROM vocab_occurrences o
      LEFT JOIN vocabulary v ON v.surface_term = o.term
      WHERE o.content_id = ?1 AND o.episode_id = ?2 AND o.term = ?3
      GROUP BY o.term, v.lemma, v.meaning_bn, v.is_corrupt`,
    )
    .bind(contentId, episodeId, term)
    .first<AnswerRow>();

  const correctMeaning = normalize(row?.meaning ?? null);
  if (!row || !correctMeaning) {
    return Response.json({ error: "Word not found" }, { status: 404 });
  }

  const selected = normalize(selectedMeaning);
  const correct = selected === correctMeaning;

  if (correct) {
    const lemma = row.lemma ?? term;
    await db
      .prepare(
        `INSERT INTO user_lemma_status (user_id, lemma, status, updated_at)
         VALUES (?1, ?2, 'learned', datetime('now'))
         ON CONFLICT(user_id, lemma)
         DO UPDATE SET status = 'learned', updated_at = excluded.updated_at`,
      )
      .bind(user.username, lemma)
      .run();

    await db
      .prepare(
        "DELETE FROM word_status WHERE user_id = ?1 AND content_id = ?2 AND episode_id = ?3 AND term = ?4 AND status = 'weak'",
      )
      .bind(user.username, contentId, episodeId, term)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO word_status (user_id, content_id, episode_id, term, status, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'weak', datetime('now'))
         ON CONFLICT(user_id, content_id, episode_id, term)
         DO UPDATE SET status = 'weak', updated_at = excluded.updated_at`,
      )
      .bind(user.username, contentId, episodeId, term)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO user_quiz_stats (user_id, content_id, episode_id, term, seen_count, correct_count, wrong_count, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, datetime('now'))
       ON CONFLICT(user_id, content_id, episode_id, term)
       DO UPDATE SET
         seen_count = seen_count + 1,
         correct_count = correct_count + ?5,
         wrong_count = wrong_count + ?6,
         last_seen_at = datetime('now')`,
    )
    .bind(user.username, contentId, episodeId, term, correct ? 1 : 0, correct ? 0 : 1)
    .run();

  return Response.json({
    correct,
    correctMeaning,
    statusApplied: correct ? "learned" : "weak",
  });
}
