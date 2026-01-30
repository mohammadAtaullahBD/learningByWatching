import { getCloudflareContext } from "@opennextjs/cloudflare";
import { clearSessionCookie, getSessionToken } from "@/lib/auth";

export const runtime = "edge";

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

export async function POST(): Promise<Response> {
  const token = await getSessionToken();
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;

  if (db && token) {
    await db
      .prepare("DELETE FROM sessions WHERE token = ?1")
      .bind(token)
      .run();
  }

  await clearSessionCookie();
  return Response.json({ ok: true });
}
