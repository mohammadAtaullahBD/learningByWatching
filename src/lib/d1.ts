import { getCloudflareContext } from "@opennextjs/cloudflare";

type EnvWithD1 = { DB?: D1Database };

export function getD1Database(): D1Database | null {
  const { env } = getCloudflareContext();
  return (env as EnvWithD1).DB ?? null;
}
