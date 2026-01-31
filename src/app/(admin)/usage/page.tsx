import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/auth";
import { getD1Database } from "@/lib/d1";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type UsageRow = {
  provider: string;
  char_count: number;
  month_key: string;
};

const buildDayKey = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLimit = async (): Promise<number> => {
  const { env } = await getCloudflareContext({ async: true });
  const limitRaw = (env as CloudflareEnv & { GOOGLE_TRANSLATE_DAILY_CHAR_LIMIT?: string })
    .GOOGLE_TRANSLATE_DAILY_CHAR_LIMIT;
  const limit = Number(limitRaw ?? "10000");
  return Number.isFinite(limit) && limit > 0 ? limit : 10000;
};

const fetchUsage = async (): Promise<UsageRow[]> => {
  const db = await getD1Database();
  if (!db) return [];
  const dayKey = buildDayKey();
  const result = await db
    .prepare(
      "SELECT provider, char_count, month_key FROM translation_usage WHERE month_key = ?1 AND provider = 'google-translate'",
    )
    .bind(dayKey)
    .all<UsageRow>();
  return result.results ?? [];
};

export default async function UsagePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/usage");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [usage, limit] = await Promise.all([fetchUsage(), getLimit()]);
  const dayKey = buildDayKey();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Admin Console
        </p>
        <h1 className="text-4xl font-semibold">Google Translate Usage</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Current day: {dayKey} (UTC) · Limit: {limit.toLocaleString()} chars
        </p>
      </header>

      <section className="rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur">
        {usage.length === 0 ? (
          <div className="p-6 text-sm text-[color:var(--muted)]">
            No Google Translate usage recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr className="border-b border-black/5">
                <th className="p-4">Provider</th>
                <th className="p-4">Estimated chars</th>
                <th className="p-4">Usage</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => {
                const pct = Math.min(100, Math.round((row.char_count / limit) * 100));
                return (
                  <tr key={row.provider} className="border-b border-black/5">
                    <td className="p-4 font-semibold">{row.provider}</td>
                    <td className="p-4">{row.char_count.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="h-2 w-full rounded-full bg-[color:var(--surface-muted)]">
                        <div
                          className="h-2 rounded-full bg-[color:var(--accent)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs text-[color:var(--muted)]">
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
