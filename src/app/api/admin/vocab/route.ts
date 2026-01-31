import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";

type VocabPayload = {
  contentId?: string;
  episodeId?: string;
  term?: string;
  lemma?: string;
  pos?: string;
  meaning?: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as VocabPayload | null;
  const { contentId, episodeId, term, lemma, pos, meaning } = payload ?? {};
  if (!contentId || !episodeId || !term || !lemma || !pos || !meaning) {
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
       SET lemma = ?1, pos = ?2, meaning_bn_override = ?3
       WHERE content_id = ?4 AND episode_id = ?5 AND term = ?6`,
    )
    .bind(lemma, pos, meaning, contentId, episodeId, term)
    .run();

  return Response.json({ ok: true });
}
