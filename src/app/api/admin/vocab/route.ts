import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

type VocabPayload = {
  contentId?: string;
  episodeId?: string;
  term?: string;
  lemma?: string;
  pos?: string;
  meaning?: string;
  action?: "update" | "resolve" | "delete";
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as VocabPayload | null;
  const { contentId, episodeId, term, lemma, pos, meaning, action } = payload ?? {};
  if (!contentId || !episodeId || !term) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  if (action === "delete") {
    await db
      .prepare(
        "DELETE FROM word_status WHERE content_id = ?1 AND episode_id = ?2 AND term = ?3",
      )
      .bind(contentId, episodeId, term)
      .run();
    await db
      .prepare(
        "DELETE FROM vocab_occurrences WHERE content_id = ?1 AND episode_id = ?2 AND term = ?3",
      )
      .bind(contentId, episodeId, term)
      .run();
    await db
      .prepare(
        "DELETE FROM vocab_terms WHERE term = ?1 AND NOT EXISTS (SELECT 1 FROM vocab_occurrences WHERE term = ?1)",
      )
      .bind(term)
      .run();
    await db
      .prepare(
        "DELETE FROM vocabulary WHERE surface_term = ?1 AND NOT EXISTS (SELECT 1 FROM vocab_occurrences WHERE term = ?1)",
      )
      .bind(term)
      .run();

    return Response.json({ ok: true });
  }

  if (action === "resolve") {
    if (!pos) {
      return Response.json({ error: "Missing pos" }, { status: 400 });
    }
    await db
      .prepare(
        `UPDATE vocab_occurrences
         SET is_corrupt_override = 0
         WHERE content_id = ?1 AND episode_id = ?2 AND term = ?3`,
      )
      .bind(contentId, episodeId, term)
      .run();
    await db
      .prepare(
        "UPDATE vocabulary SET is_corrupt = 0 WHERE surface_term = ?1 AND pos = ?2",
      )
      .bind(term, pos)
      .run();
    return Response.json({ ok: true });
  }

  if (!lemma || !pos || !meaning) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  await db
    .prepare(
      `UPDATE vocab_occurrences
       SET lemma = ?1, pos = ?2, meaning_bn_override = ?3, is_corrupt_override = 0
       WHERE content_id = ?4 AND episode_id = ?5 AND term = ?6`,
    )
    .bind(lemma, pos, meaning, contentId, episodeId, term)
    .run();
  await db
    .prepare(
      `UPDATE vocabulary
       SET lemma = ?1, pos = ?2, meaning_bn = ?3, is_corrupt = 0, updated_at = datetime('now')
       WHERE surface_term = ?4`,
    )
    .bind(lemma, pos, meaning, term)
    .run();

  return Response.json({ ok: true });
}
