import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

type PackPayload = {
  contentId?: string;
  episodeId?: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database; SUBTITLE_BUCKET?: R2Bucket };

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as PackPayload | null;
  if (!payload?.contentId || !payload?.episodeId) {
    return Response.json({ error: "Missing contentId or episodeId" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const { VOCAB_DB: db, SUBTITLE_BUCKET } = env as EnvWithDb;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { contentId, episodeId } = payload;

  const fileRow = await db
    .prepare("SELECT r2_key as r2Key FROM subtitle_files WHERE content_id = ?1 AND episode_id = ?2")
    .bind(contentId, episodeId)
    .first<{ r2Key: string }>();

  if (fileRow?.r2Key && SUBTITLE_BUCKET) {
    await SUBTITLE_BUCKET.delete(fileRow.r2Key);
  }

  await db
    .prepare("DELETE FROM word_status WHERE content_id = ?1 AND episode_id = ?2")
    .bind(contentId, episodeId)
    .run();

  await db
    .prepare("DELETE FROM vocab_occurrences WHERE content_id = ?1 AND episode_id = ?2")
    .bind(contentId, episodeId)
    .run();

  await db
    .prepare("DELETE FROM subtitle_files WHERE content_id = ?1 AND episode_id = ?2")
    .bind(contentId, episodeId)
    .run();

  await db
    .prepare(
      "DELETE FROM vocab_terms WHERE term NOT IN (SELECT DISTINCT term FROM vocab_occurrences)",
    )
    .run();

  await db
    .prepare(
      "DELETE FROM vocabulary WHERE surface_term NOT IN (SELECT DISTINCT term FROM vocab_occurrences)",
    )
    .run();

  return Response.json({ ok: true });
}
