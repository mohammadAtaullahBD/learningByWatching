import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

const allowedStatuses = new Set(["new", "learned", "weak"]);

type StatusPayload = {
  contentId?: string;
  episodeId?: string;
  term?: string;
  status?: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(request: Request): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as StatusPayload | null;
  if (!payload) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { contentId, episodeId, term, status } = payload;
  if (!contentId || !episodeId || !term || !status || !allowedStatuses.has(status)) {
    return Response.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  await db
    .prepare(
      `INSERT INTO word_status (user_id, content_id, episode_id, term, status, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
       ON CONFLICT(user_id, content_id, episode_id, term)
       DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
    .bind("default", contentId, episodeId, term, status)
    .run();

  return Response.json({ ok: true });
}
