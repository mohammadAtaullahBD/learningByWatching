import { getCloudflareContext } from "@opennextjs/cloudflare";

type EnvWithD1 = { DB?: D1Database };

export async function getD1Database(): Promise<D1Database | null> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as EnvWithD1).DB ?? null;
}
