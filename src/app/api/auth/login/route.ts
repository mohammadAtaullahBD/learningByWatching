import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  generateToken,
  hashPassword,
  parseStoredSalt,
  setSessionCookie,
} from "@/lib/auth";

export const runtime = "edge";

type LoginPayload = {
  username?: string;
  password?: string;
};

type UserRow = {
  username: string;
  password_hash: string;
  salt: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export async function POST(request: Request): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as LoginPayload | null;
  if (!payload) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = normalizeUsername(payload.username ?? "");
  const password = payload.password ?? "";

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const user = await db
    .prepare(
      "SELECT username, password_hash, salt FROM users WHERE username = ?1",
    )
    .bind(username)
    .first<UserRow>();

  if (!user) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const salt = parseStoredSalt(user.salt);
  const hash = await hashPassword(password, salt);
  if (hash !== user.password_hash) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (token, username, expires_at) VALUES (?1, ?2, ?3)")
    .bind(token, username, expiresAt)
    .run();

  await setSessionCookie(token);

  return Response.json({ ok: true });
}
