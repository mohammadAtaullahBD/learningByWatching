import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

type ReportPayload = {
  contentId?: string;
  episodeId?: string;
  term?: string;
  observedMeaning?: string;
  suggestedMeaning?: string;
  source?: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  const payload = (await request.json().catch(() => null)) as ReportPayload | null;
  const { contentId, episodeId, term, observedMeaning, suggestedMeaning, source } =
    payload ?? {};
  if (!contentId || !episodeId || !term) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  await db
    .prepare(
      `UPDATE vocab_occurrences
       SET is_corrupt_override = 1
       WHERE content_id = ?1 AND episode_id = ?2 AND term = ?3`,
    )
    .bind(contentId, episodeId, term)
    .run();

  await db
    .prepare(
      "UPDATE vocabulary SET is_corrupt = 1 WHERE surface_term = ?1",
    )
    .bind(term)
    .run();

  await db
    .prepare(
      `INSERT INTO vocab_reports
       (content_id, episode_id, term, observed_meaning, suggested_meaning, reporter_id, source)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      contentId,
      episodeId,
      term,
      observedMeaning ?? null,
      suggestedMeaning ?? null,
      user?.username ?? null,
      source ?? null,
    )
    .run();

  return Response.json({ ok: true });
}
