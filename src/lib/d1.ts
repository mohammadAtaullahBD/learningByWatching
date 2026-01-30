import { getCloudflareContext } from "@opennextjs/cloudflare";

type EnvWithD1 = { VOCAB_DB?: D1Database; DB?: D1Database };

export async function getD1Database(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as EnvWithD1;
    return bindings.VOCAB_DB ?? bindings.DB ?? null;
  } catch (error) {
    console.error("getD1Database failed", error);
    return null;
  }
}
