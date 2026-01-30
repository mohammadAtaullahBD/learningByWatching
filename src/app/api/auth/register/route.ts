import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  generateSalt,
  hashPassword,
  setSessionCookie,
  generateToken,
} from "@/lib/auth";

export const runtime = "edge";

type RegisterPayload = {
  username?: string;
  password?: string;
};

type EnvWithDb = CloudflareEnv & { VOCAB_DB?: D1Database };

const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export async function POST(request: Request): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as RegisterPayload | null;
  if (!payload) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const usernameRaw = payload.username ?? "";
  const password = payload.password ?? "";
  const username = normalizeUsername(usernameRaw);

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return Response.json(
      { error: "Username must be 3-24 chars (lowercase, numbers, _)." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 chars." }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as EnvWithDb).VOCAB_DB;
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const existing = await db
    .prepare("SELECT username FROM users WHERE username = ?1")
    .bind(username)
    .first<{ username: string }>();

  if (existing) {
    return Response.json({ error: "Username already exists." }, { status: 409 });
  }

  const admins = await db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .first<{ count: number }>();

  const role = (admins?.count ?? 0) === 0 ? "admin" : "user";

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const saltEncoded = btoa(String.fromCharCode(...salt));

  await db
    .prepare(
      "INSERT INTO users (username, password_hash, salt, role) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(username, passwordHash, saltEncoded, role)
    .run();

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (token, username, expires_at) VALUES (?1, ?2, ?3)")
    .bind(token, username, expiresAt)
    .run();

  await setSessionCookie(token);

  return Response.json({ ok: true, role });
}
